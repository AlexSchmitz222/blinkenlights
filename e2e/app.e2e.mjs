/**
 * UI tests in the real browser (Firefox). Run with `npm run test:ui`.
 * Every test also takes a screenshot into e2e/screenshots/ for a quick visual check.
 */
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launchBrowser, openPage, go, resetApp, setPreference, screenshot, text, sleep } from './support/harness.mjs';

let stopServer;
let browser;
let page;
let errors;

before(async () => {
  stopServer = await startServer();
  browser = await launchBrowser();
});

after(async () => {
  await browser?.close();
  await stopServer?.();
});

beforeEach(async () => {
  ({ page, errors } = await openPage(browser));
  await resetApp(page);
});

afterEach(async () => {
  const found = [...errors];
  await page?.close();
  assert.deepEqual(found, [], 'no console errors or uncaught exceptions');
});

describe('start page', () => {
  it('shows the live house front and the B logo', async () => {
    await go(page, '/');
    assert.equal(await page.title(), 'Blinkenlights');
    assert.ok(await page.$('app-pixel-grid.facade'), 'house front is rendered');

    const logo = await page.$$eval('app-logo i', cells => cells.map(c => c.classList.contains('on')));
    assert.equal(logo.length, 20, 'logo is a 4×5 grid');
    assert.equal(logo.filter(Boolean).length, 13, 'logo lights form the B');

    // the intro text scrolls: two moments differ
    const lit = () => page.$$eval('app-pixel-grid.facade .cell.on', cells => cells.length);
    const first = await lit();
    await sleep(600);
    assert.notEqual(await lit(), first, 'the house front animates');
    await screenshot(page, 'start');
  });
});

describe('shows', () => {
  it('lists the demo shows', async () => {
    await go(page, '/shows');
    const names = await page.$$eval('.card .name', els => els.map(e => e.textContent.trim()));
    assert.deepEqual(names.sort(), ['Hallo Berlin', 'Welcome']);
    assert.match(await text(page, '.card .stats'), /\d+ frames/);
    await screenshot(page, 'shows');
  });

  it('opens the new show dialog with the grid presets', async () => {
    await go(page, '/shows');
    const buttons = await page.$$('.page-header button');
    await buttons.at(-1).click();
    await page.waitForSelector('app-new-show-dialog .preset');
    const presets = await page.$$eval('app-new-show-dialog .preset .name', els => els.map(e => e.textContent.trim()));
    assert.deepEqual(presets, ['Blinkenlights', 'Arcade', 'Wide']);
    await screenshot(page, 'new-show-dialog');
  });
});

describe('shape editor', () => {
  it('draws a pixel, marks the shape unsaved and saves it', async () => {
    await go(page, '/shapes/heart_filled');
    const lit = async () => Number((await text(page, '.canvas-bar span:nth-child(3)')).match(/\d+/)[0]);
    const before = await lit();

    // top-left cell of the heart is off: click it to switch it on
    const cell = await page.$('.canvas .cell:not(.on)');
    await cell.click();
    assert.equal(await lit(), before + 1);
    assert.ok(await page.$('.chip.unsaved'), 'unsaved marker is shown');

    await page.keyboard.down('Control');
    await page.keyboard.press('s');
    await page.keyboard.up('Control');
    await sleep(200);
    assert.equal(await page.$('.chip.unsaved'), null, 'saved');
    await screenshot(page, 'shape-editor');
  });
});

describe('shape editor tools', () => {
  it('draws a line by dragging with the line tool, and undoes it', async () => {
    await go(page, '/shapes/new');
    const lit = async () => Number((await text(page, '.canvas-bar span:nth-child(3)')).match(/\d+/)[0]);
    await page.keyboard.press('l');

    const cells = await page.$$('.canvas .cell');
    const first = await cells[0].boundingBox(); // new shapes are 8×8: cell 0 is top-left, cell 7 top-right
    const last = await cells[7].boundingBox();
    await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
    await page.mouse.down();
    await page.mouse.move(last.x + last.width / 2, last.y + last.height / 2, { steps: 8 });
    await page.mouse.up();
    assert.equal(await lit(), 8, 'a full row is lit');
    await screenshot(page, 'shape-editor-line-tool');

    await page.keyboard.down('Control');
    await page.keyboard.press('z');
    await page.keyboard.up('Control');
    assert.equal(await lit(), 0, 'the whole line is undone in one step');
  });
});

describe('show editor', () => {
  beforeEach(async () => {
    await go(page, '/shows/show_demo_welcome');
  });

  it('selects an object by clicking it on the stage', async () => {
    const grid = await page.$('.stage-area .grid');
    const box = await grid.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // the heart is centred
    await page.waitForSelector('.stage-area .highlight');
    assert.match(await text(page, '.properties .panel-title'), /shape/i);
    await screenshot(page, 'show-editor-object');
  });

  it('selects several frames with Ctrl/Shift + click and edits their duration together', async () => {
    const frames = await page.$$('.timeline .frame');
    await page.keyboard.down('Control');
    await frames[2].click();
    await page.keyboard.up('Control');
    await page.keyboard.down('Shift');
    await frames[4].click();
    await page.keyboard.up('Shift');

    assert.match(await text(page, '.properties section .panel-title'), /3 frames selected/);

    const duration = await page.$('.properties input.num.wide');
    await duration.click({ count: 3 });
    await page.keyboard.type('250');
    await sleep(200);

    const durations = await page.$$eval('.timeline .scene:first-child .frame .frame-meta span:last-child', els =>
      els.map(e => e.textContent.trim()),
    );
    assert.deepEqual(durations.slice(2, 5), ['250', '250', '250']);
    assert.notEqual(durations[0], '250', 'unselected frames keep their duration');
    await screenshot(page, 'show-editor-multiselect');

    await page.keyboard.down('Control');
    await page.keyboard.press('z');
    await page.keyboard.up('Control');
    await sleep(200);
    const undone = await page.$$eval('.timeline .scene:first-child .frame .frame-meta span:last-child', els =>
      els.map(e => e.textContent.trim()),
    );
    assert.notDeepEqual(undone.slice(2, 5), ['250', '250', '250'], 'undo reverts the batch edit');
  });

  it('opens the frame context menu with shortcut hints on one line', async () => {
    const frames = await page.$$('.timeline .frame');
    await frames[1].click({ button: 'right' });
    await page.waitForSelector('.mat-mdc-menu-panel');
    const hintHeights = await page.$$eval('.mat-mdc-menu-panel .kbd-hint', els => els.map(e => e.getBoundingClientRect().height));
    assert.ok(hintHeights.length > 0);
    assert.ok(hintHeights.every(h => h < 20), 'shortcut hints do not wrap');
    await screenshot(page, 'show-editor-context-menu');
  });

  it('aligns the compact icon buttons with their headings', async () => {
    const offsets = await page.$$eval('.section-head, .scene-head', heads =>
      heads
        .map(head => {
          const button = head.querySelector('.icon-btn-sm');
          const title = head.querySelector('.panel-title, .scene-name');
          if (!button || !title) return null;
          const icon = button.querySelector('mat-icon').getBoundingClientRect();
          const b = button.getBoundingClientRect();
          const t = title.getBoundingClientRect();
          return {
            iconInButton: Math.abs(icon.y + icon.height / 2 - (b.y + b.height / 2)),
            buttonToTitle: Math.abs(b.y + b.height / 2 - (t.y + t.height / 2)),
          };
        })
        .filter(Boolean),
    );
    assert.ok(offsets.length > 0);
    for (const o of offsets) {
      assert.ok(o.iconInButton <= 1, `icon centred in its button (off by ${o.iconInButton}px)`);
      assert.ok(o.buttonToTitle <= 4, `button lines up with its heading (off by ${o.buttonToTitle}px)`);
    }
  });
});

describe('player', () => {
  it('plays the show and switches between house front and pixels', async () => {
    await go(page, '/play/show_demo_berlin');
    const position = () => page.$eval('.scrubber input', el => Number(el.value));
    const start = await position();
    await sleep(700);
    assert.ok((await position()) > start, 'playback advances');

    const isFacade = () => page.$eval('app-pixel-grid.stage', el => el.classList.contains('facade'));
    const initial = await isFacade();
    await page.keyboard.press('v');
    await sleep(100);
    assert.notEqual(await isFacade(), initial, 'V toggles the view');
    await page.keyboard.press('+');
    assert.match(await text(page, '.bar .speed'), /^1\.5×$/, '+ speeds up');
    await page.keyboard.press('-');
    await page.keyboard.press('-');
    assert.match(await text(page, '.bar .speed'), /^0\.5×$/, '- slows down');

    await page.mouse.move(400, 820); // show the controls for the screenshot
    await screenshot(page, 'player');
  });
});

describe('language and theme', () => {
  it('switches to German and dark mode', async () => {
    await setPreference(page, 'blinkenlights.pref.language', 'de');
    await setPreference(page, 'blinkenlights.theme', 'dark');
    await go(page, '/shows/show_demo_welcome');

    assert.equal(await page.evaluate(() => document.documentElement.lang), 'de');
    assert.equal(await page.evaluate(() => document.documentElement.style.colorScheme), 'dark');
    const nav = await page.$$eval('nav a span', els => els.map(e => e.textContent.trim()));
    assert.deepEqual(nav, ['Shows', 'Formen']);
    assert.match(await text(page, '.editor-bar'), /Vorschau/);
    assert.equal(await page.title(), 'Show-Editor · Blinkenlights');
    await screenshot(page, 'show-editor-dark-de');
  });
});

describe('icons', () => {
  /**
   * For every visible icon: the vertical distance between the icon's centre and the centre of the text
   * next to it (or of the control it sits in, for icon-only buttons). Icons used to sit a few px low
   * because inline SVGs align to the text baseline.
   */
  const misaligned = () =>
    [...document.querySelectorAll('mat-icon')]
      .filter(icon => icon.getBoundingClientRect().height > 0 && !icon.closest('.play-overlay'))
      .map(icon => {
        const control = icon.closest('button, a, .layer, .lib-item, .chip, h2, h3, li') ?? icon.parentElement;
        const svg = (icon.querySelector('svg') ?? icon).getBoundingClientRect();
        const label = [...control.querySelectorAll('span, .mdc-button__label')].find(s => s.textContent.trim() && !s.contains(icon));
        const ref = (label ?? control).getBoundingClientRect();
        const offset = svg.y + svg.height / 2 - (ref.y + ref.height / 2);
        return { icon: icon.getAttribute('svgicon') ?? icon.closest('button, a')?.getAttribute('aria-label'), offset: Math.round(offset * 10) / 10 };
      })
      .filter(m => Math.abs(m.offset) > 1.5);

  for (const route of ['/', '/shows', '/shapes', '/shapes/heart_filled', '/shows/show_demo_welcome', '/play/show_demo_berlin']) {
    it(`are vertically centred on ${route}`, async () => {
      await go(page, route);
      await page.mouse.move(400, 830); // keeps the player controls visible
      await sleep(300);
      assert.deepEqual(await page.evaluate(misaligned), []);
    });
  }

  it('are vertically centred in menus and the object panel', async () => {
    await go(page, '/shows/show_demo_welcome');
    const grid = await page.$('.stage-area .grid');
    const box = await grid.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForSelector('.stage-area .highlight');
    assert.deepEqual(await page.evaluate(misaligned), [], 'object panel');

    const frames = await page.$$('.timeline .frame');
    await frames[1].click({ button: 'right' });
    await page.waitForSelector('.mat-mdc-menu-panel');
    assert.deepEqual(await page.evaluate(misaligned), [], 'frame context menu');
  });
});

describe('phone width', () => {
  for (const route of ['/', '/shows', '/shapes', '/shapes/heart_filled', '/shows/show_demo_welcome', '/play/show_demo_berlin']) {
    it(`has no horizontal page scroll on ${route}`, async () => {
      await page.setViewport({ width: 390, height: 844 });
      await go(page, route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, `page is ${overflow}px wider than the screen`);
      await screenshot(page, `phone${route.replace(/\//g, '-') || '-start'}`);
    });
  }
});
