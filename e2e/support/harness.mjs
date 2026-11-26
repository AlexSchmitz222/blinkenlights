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

export const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

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
 * Opens a page that records console errors and uncaught exceptions, so tests can assert there were none.
 * Errors passed to Angular's ErrorHandler are logged as objects; they are turned into readable text here.
 */
export async function openPage(browser, viewport = { width: 1366, height: 860 }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errors = [];
  page.on('console', async message => {
    if (message.type() !== 'error') return;
    const parts = await Promise.all(
      message.args().map(arg =>
        arg.evaluate(v => (v instanceof Error ? `${v.name}: ${v.message}` : String(v))).catch(() => message.text()),
      ),
    );
    errors.push(parts.join(' '));
  });
  page.on('pageerror', error => errors.push(String(error)));
  return { page, errors };
}

/** Goes to a route and waits until the app has settled. */
export async function go(page, route) {
  await page.goto(BASE + route, { waitUntil: 'networkidle0' });
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
