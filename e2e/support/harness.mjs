/**
 * Shared setup for the UI tests: starts (or reuses) the dev server, launches the installed Firefox via
 * WebDriver BiDi, and offers small helpers. No browser is downloaded; puppeteer-core drives the local Firefox.
 *
 * Environment:
 *   E2E_BASE_URL  use an already running app instead of starting `ng serve` (default http://localhost:4321)
 *   FIREFOX_BIN   path to Firefox (default: first of /snap/bin/firefox, /usr/bin/firefox, `firefox` in PATH)
 *   E2E_HEADFUL=1 show the browser window
 */
import puppeteer from 'puppeteer-core';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../..');
export const SCREENSHOTS = path.join(ROOT, 'e2e/screenshots');
/** Files the app offers for download land here (no dialog). Git-ignored; old files are left in place. */
export const DOWNLOADS = path.join(ROOT, 'e2e/downloads');
// Inside the project (not /tmp): snap-packaged Firefox can't read /tmp. Reused between runs, git-ignored.
const PROFILE = path.join(ROOT, 'e2e/.profile');
const PORT = 4321;

export const BASE = (process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`).replace(/\/$/, '');
/** The sub-path the app is served from ('' locally, '/blinkenlights' for the GitHub Pages build). */
export const BASE_PATH = new URL(BASE).pathname.replace(/\/$/, '');

/** The current route inside the app, without the sub-path, e.g. '/shows/abc'. */
export function appPath(page) {
  const path = new URL(page.url()).pathname;
  return (path.startsWith(BASE_PATH) ? path.slice(BASE_PATH.length) : path) || '/';
}

function findFirefox() {
  if (process.env.FIREFOX_BIN) return process.env.FIREFOX_BIN;
  for (const candidate of ['/snap/bin/firefox', '/usr/bin/firefox', '/Applications/Firefox.app/Contents/MacOS/firefox']) {
    if (existsSync(candidate)) return candidate;
  }
  try {
    return execFileSync('which', ['firefox'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('Firefox not found. Install it or set FIREFOX_BIN.');
  }
}

async function isUp(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

/** Starts `ng serve` unless the app is already reachable. Returns a stop function. */
export async function startServer() {
  if (await isUp(BASE)) return async () => {};
  if (process.env.E2E_BASE_URL) throw new Error(`E2E_BASE_URL ${BASE} is not reachable`);

  const server = spawn('npx', ['ng', 'serve', '--port', String(PORT), '--no-open'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true, // own process group, so we can stop ng and its children together
  });
  let output = '';
  server.stdout.on('data', d => (output += d));
  server.stderr.on('data', d => (output += d));

  const deadline = Date.now() + 180_000;
  while (!(await isUp(BASE))) {
    if (server.exitCode !== null) throw new Error(`ng serve exited:\n${output}`);
    if (Date.now() > deadline) throw new Error(`ng serve did not start in time:\n${output}`);
    await new Promise(r => setTimeout(r, 1000));
  }
  return async () => {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      // already gone
    }
  };
}

export async function launchBrowser() {
  mkdirSync(PROFILE, { recursive: true });
  mkdirSync(SCREENSHOTS, { recursive: true });
  mkdirSync(DOWNLOADS, { recursive: true });
  return puppeteer.launch({
    browser: 'firefox',
    executablePath: findFirefox(),
    headless: process.env.E2E_HEADFUL !== '1',
    userDataDir: PROFILE,
    protocolTimeout: 60_000,
    extraPrefsFirefox: {
      'intl.accept_languages': 'en-US',
      'ui.systemUsesDarkTheme': 0,
      // save downloads straight into e2e/downloads instead of asking
      'browser.download.folderList': 2,
      'browser.download.dir': DOWNLOADS,
      'browser.download.useDownloadDir': true,
      'browser.download.always_ask_before_handling_new_types': false,
      'browser.download.alwaysOpenPanel': false,
    },
  });
}

/**
 * Opens a page that records the app's errors: console.error (also used by Angular's ErrorHandler),
 * uncaught exceptions and unhandled promise rejections.
 *
 * The page records them itself (a script added to every document) and the tests read the list.
 * Puppeteer's own `console`/`pageerror` events are not used: over WebDriver BiDi, Firefox also
 * reports exceptions from Puppeteer's helper scripts there (e.g. while a page navigates), which
 * would look like app errors.
 */
export async function openPage(browser, viewport = { width: 1366, height: 860 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => {
    const errors = [];
    Object.defineProperty(window, '__e2eErrors', { value: errors });
    const describe = value => (value instanceof Error ? `${value.name}: ${value.message}` : String(value));
    const original = console.error.bind(console);
    console.error = (...args) => {
      errors.push(args.map(describe).join(' '));
      original(...args);
    };
    window.addEventListener('error', event => errors.push(`uncaught: ${event.message}`));
    window.addEventListener('unhandledrejection', event => errors.push(`unhandled rejection: ${describe(event.reason)}`));
  });
  const errors = [];
  pages.set(page, errors);
  return { page, errors };
}

const pages = new WeakMap();

/**
 * Moves the errors the current document recorded into the page's list. Call before the document is
 * replaced (go() does) and before checking the list (the tests' afterEach does).
 */
export async function collectErrors(page) {
  const errors = pages.get(page);
  if (!errors) return [];
  const found = await page.evaluate(() => (window.__e2eErrors ? window.__e2eErrors.splice(0) : [])).catch(() => []);
  errors.push(...found);
  return errors;
}

/**
 * Goes to a route (or a full URL) and waits until the app has rendered the page.
 *
 * Deliberately not `networkidle0`: Firefox loads favicons through a separate channel that WebDriver
 * BiDi doesn't always report as finished, so "no open requests" can wait forever.
 */
export async function go(page, routeOrUrl) {
  const url = /^https?:/.test(routeOrUrl) ? routeOrUrl : BASE + routeOrUrl;
  await collectErrors(page); // keep what the current document recorded before it is replaced
  await page.goto(url, { waitUntil: 'load' });
  // the routed page sits right after <router-outlet>; lazy pages need a moment to load their chunk
  await page.waitForFunction(() => !!document.querySelector('main router-outlet')?.nextElementSibling, { timeout: 15_000 });
  await sleep(150); // let first effects (seeding, autoplay) run
}

/** Wipes the app's saved data so the next page load behaves like a first visit (demo data is seeded). */
export async function resetApp(page) {
  await go(page, '/');
  await page.evaluate(() => localStorage.clear());
}

export async function setPreference(page, key, value) {
  await page.evaluate((k, v) => localStorage.setItem(k, v), key, value);
}

export async function screenshot(page, name) {
  await sleep(300);
  await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`) });
}

export async function text(page, selector) {
  return page.$eval(selector, el => el.textContent?.trim() ?? '');
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Waits until a menu has opened completely. Clicking an item while the menu still animates open
 * can miss it.
 */
export async function waitForMenu(page) {
  await page.waitForSelector('.mat-mdc-menu-panel');
  await page.waitForFunction(() => {
    const panel = document.querySelector('.mat-mdc-menu-panel');
    return !!panel && panel.getAnimations({ subtree: true }).every(a => a.playState !== 'running') && getComputedStyle(panel).opacity === '1';
  });
  await sleep(50);
}

/** The files currently in DOWNLOADS; pass it to waitForDownload so only a new file counts. */
export function existingDownloads() {
  return new Set(readdirSync(DOWNLOADS));
}

/**
 * Waits for a new, completely written download whose name matches `pattern` (Firefox appends "(1)",
 * "(2)", … when a name exists already). Returns its path.
 */
export async function waitForDownload(pattern, known, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const match = readdirSync(DOWNLOADS).find(f => !known.has(f) && pattern.test(f) && !f.endsWith('.part'));
    if (match) {
      const file = path.join(DOWNLOADS, match);
      const size = statSync(file).size;
      await sleep(300);
      if (size > 0 && statSync(file).size === size) return file; // finished writing
    }
    await sleep(200);
  }
  throw new Error(`no new download matching ${pattern} within ${timeout} ms`);
}
