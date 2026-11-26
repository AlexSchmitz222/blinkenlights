# Blinkenlights

A digital homage to [Blinkenlights](https://en.wikipedia.org/wiki/Project_Blinkenlights), the light installation the Chaos Computer Club put on the Haus des Lehrers in Berlin in 2001. In that installation, every window of the building was one pixel.

You can use this app to draw pixel shapes, arrange them into frames and scenes, and play your show back on a virtual house front. It runs entirely in the browser and has no server or account.

## Features

- **Shape editor**: draw with pencil, line, rectangle, filled rectangle and fill. The right mouse button erases with every tool. You can resize up to 39×21, shift, flip, invert or clear the pattern, and undo/redo every step.
- **Image import**: turn a picture (for example a logo) into a shape. A live preview lets you set the width, the brightness threshold and invert.
- **Show editor**: a single screen with a shape library, a stage where you drag objects around, a properties panel and a timeline. In the timeline you can drag & drop frames and scenes to reorder them. You can also select several frames with Ctrl/⌘ + click or Shift + click and change their duration, duplicate or delete them together. Frames and objects can be copied, cut and pasted, also from one show into another. The editor also has undo/redo, onion skin and keyboard shortcuts.
- **Generators**: build these without placing every frame by hand:
  - scrolling text
  - an object moving along a path
  - a blinking frame
  - typewriter text
  - random sparkles
  - a wipe to the next frame
- **Pixel fonts**:
  - a 5×7 proportional font with lowercase letters, descenders, umlauts and a ♥. One line of text is 8 pixels tall, so it fits the original 18×8 building.
  - a small 3×5 font with capitals only, which fits 4 instead of 3 characters on that building.
- **Player**: a fullscreen player with a house-front view, looping, frame stepping, speeds from 0.25× to 2×, and controls that hide while the show plays.
- **Grid presets**: Blinkenlights (18×8, Berlin 2001), Arcade (26×20, Paris 2002) and Wide (39×21).
- **Sharing**: a link that contains the whole show, compressed, behind the `#`. That part of the address is never sent to a server, so no backend is needed. Links are kept short for chat apps (Discord allows 2000 characters): the demo shows take 470–880 characters and a 200-frame show using every generator about 1050. To get there, the link leaves out ids, stores frames as changes to the frame before, and stores sparkles as a recipe instead of pixels. Whoever opens the link watches the show on the house front and can add it to their own shows. Shapes come along and never overwrite existing ones. You can also share the link or a GIF through the system share sheet. The link works for others once the app is online.
- **Animated GIF export**: in the house-front or the pixel look, in three sizes. A GIF can be shared anywhere, also with people who don't have the app.
- **Import/export**:
  - `.blinken.json` files: a single show together with the shapes it uses, or a full backup.
  - The original **BLM** and **BML** movie formats, including grayscale BML.
- **Light and dark mode**: follows the system setting and can be switched in the toolbar. The player always stays dark.
- **English and German**: the app starts in the browser's language. You can switch it in the toolbar, and the choice is remembered.

## Data model

```
Show ── size (grid), loop
 └─ Scene ── name
     └─ Frame ── duration in ms (0 = hold until continued)
         └─ FrameObject ── position, inverted
              ├─ shape   → references a Shape by id
              ├─ text    → rendered with the pixel font
              └─ bitmap  → raw pixels (used for imported BLM/BML movies)
```

Frames reference shapes by id instead of storing pixels. When you change a shape, every show that uses it changes too. An exported show file contains copies of all the shapes it uses.

## Storage

All data lives in the browser's `localStorage` under the key `blinkenlights.data`. The data is versioned so that later formats can migrate it. To back up your data or move it to another browser, use **Shows → ⋮ → Back up everything**. To restore, import the backup file.

On first start the app adds five demo shapes and two demo shows. Shapes saved by the very first version of the app (under the key `shapes`) are migrated automatically.

### File formats

| File | Content |
|---|---|
| `*.blinken.json` with `"format": "blinkenlights-show"` | One show plus every shape it uses |
| `*.blinken.json` with `"format": "blinkenlights-backup"` | All shows and shapes |
| `*.blm` | Original Blinkenlights Movie (text, `@duration` + rows of `0`/`1`) |
| `*.bml` | Original Blinkenlights Markup Language (XML; 1–8 bit, 1 or 3 channels) |

How imports handle conflicts:
- If an imported shape is identical to an existing one, the existing shape is reused.
- If an imported shape has the same id as an existing one but different pixels, it is added under a new id. The existing shape is never overwritten.
- If an imported show has the same id as an existing one, you are asked whether to replace it or keep both.

## Keyboard shortcuts

| Where | Keys |
|---|---|
| Player | <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> step · <kbd>Home</kbd> back to start · <kbd>L</kbd> loop · <kbd>V</kbd> house front / pixels · <kbd>−</kbd>/<kbd>+</kbd> slower/faster · <kbd>F</kbd> fullscreen |
| Show editor | <kbd>Space</kbd> preview · <kbd>Ctrl</kbd>+<kbd>S</kbd> save · <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> undo/redo · <kbd>Ctrl</kbd>+click / <kbd>Shift</kbd>+click select several frames · <kbd>Ctrl</kbd>+<kbd>A</kbd> select the scene · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate selected frames · <kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>X</kbd> / <kbd>V</kbd> copy, cut, paste (the selected object, or the selected frames) · arrows move the selected object (<kbd>Shift</kbd> = 5 px), or step through frames when nothing is selected · <kbd>,</kbd>/<kbd>.</kbd> previous/next frame · <kbd>Del</kbd> delete the selected object, or the selected frames · <kbd>Esc</kbd> deselect · <kbd>O</kbd> onion skin |
| Shape editor | <kbd>P</kbd> pencil · <kbd>L</kbd> line · <kbd>R</kbd> rectangle · <kbd>B</kbd> filled rectangle · <kbd>F</kbd> fill · <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> undo/redo · <kbd>Ctrl</kbd>+<kbd>S</kbd> save · <kbd>Alt</kbd>+arrows shift the pattern · right mouse button erases |

## Development

Requires Node.js 20.19+, 22.12+ or 24+.

```bash
npm install
npm start          # dev server on http://localhost:4200
npm test           # unit tests (Vitest + jsdom)
npm run test:ui    # UI tests in the real browser (Firefox), see below
npm run build      # production build into dist/blinkenlights
```

### Publishing on GitHub Pages

`.github/workflows/pages.yml` builds the app, runs the unit tests and publishes it on every push to `main`. You can also start it by hand under *Actions*. The app then runs at **https://alexschmitz222.github.io/blinkenlights/**.

**Is it up to date?** The start page shows which build is running (commit and build time, linked to the commit). On the published site it also asks GitHub whether that is the newest commit on `main`: it then shows "✓ up to date" or "N newer commits on GitHub, not published yet", the latter meaning the deployment is still running or failed. If your browser runs an older, cached version than the one deployed, a notice offers to reload. For that, every build writes a `version.json` next to the app.

One-time setup: in the repository open *Settings → Pages → Build and deployment* and set *Source* to **GitHub Actions**. For a private repository, GitHub Pages needs a paid plan.

```bash
npm run build:pages     # build for the /blinkenlights/ sub-path (+ 404.html for direct links)
npm run test:ui:pages   # UI tests against that build, served like GitHub Pages serves it
```

### UI tests

`e2e/app.e2e.mjs` clicks through the app in the installed **Firefox** using `puppeteer-core` over WebDriver BiDi. No browser is downloaded. The tests run on Node's built-in test runner. They check the most important flows and fail if the browser console shows an error:
- start page and logo
- show list and the new-show dialog
- drawing in the shape editor
- in the show editor: selecting objects, multi-frame selection, the context menu, alignment of the small buttons
- player
- German and dark mode
- no horizontal scrolling at phone width

Each test also saves a screenshot to `e2e/screenshots/` for a quick visual check.

```bash
npm run test:ui                                  # starts `ng serve` itself, or reuses one on port 4321
E2E_HEADFUL=1 npm run test:ui                    # watch the browser
FIREFOX_BIN=/path/to/firefox npm run test:ui     # if Firefox isn't found automatically
E2E_BASE_URL=http://localhost:4200 npm run test:ui
```

The Firefox test profile lives in `e2e/.profile`. It sits inside the project because snap-packaged Firefox can't use `/tmp`. Both the profile and the screenshots are git-ignored.

Project layout:

```
src/app/
  components/      pages: start, show-list, show-editor, player, shape-list, shape-details
  shared/          pixel-grid (the interactive stage), grid-thumb (cheap canvas previews)
  core/
    interfaces/    data model
    services/      drawing, text, rendering, player, storage, file formats, generators
    utils/         immutable show edits, ids, preferences
    theme/         light/dark mode
  shapes/          default shapes and the pixel font
  core/i18n/       translations (en, de), the t pipe and the title strategy
  shows/           demo shows
e2e/               UI tests (Firefox)
public/
  icons/           Material Design Icons as SVG (see below)
  fonts/           JetBrains Mono
```

### Translations

All texts live in `src/app/core/i18n/`. `en.ts` is the reference, and `de.ts` must have exactly the same keys: a missing key is a compile error. In templates, use `{{ 'shows.title' | t }}`. In code, use `inject(I18nService).t('shows.title')`. Texts can contain `{placeholders}` and a simple plural in the form `one|many`, which is chosen by `count`.

To add a language:
1. Copy `de.ts`, translate the texts and type the copy as `Dictionary<typeof en>`.
2. Register it in `DICTIONARIES` and `LANGUAGES` in `i18n.service.ts`.

### Logo and favicons

The "B" logo is a 4×5 pixel pattern in `src/app/shared/logo/logo.component.ts`. After changing it, update the copy of the pattern in `scripts/generate-favicon.py` and run `python3 scripts/generate-favicon.py` (needs Pillow). The script regenerates `favicon.svg`, `favicon.ico` and `apple-touch-icon.png`.

### Icons

Icons come from [Material Design Icons](https://pictogrammers.com/library/mdi/) by Pictogrammers and are stored as individual SVG files in `public/icons/`. To add one:
1. Download `<name>.svg` from pictogrammers into `public/icons/`.
2. Add the name to `src/app/core/icons.ts`.
3. Use it as `<mat-icon svgIcon="<name>" />`.

### Credits & licenses

- Icons: Material Design Icons by Pictogrammers, Apache 2.0 (`public/icons/LICENSE`)
- Font: JetBrains Mono, SIL Open Font License 1.1 (`public/fonts/OFL.txt`)
- GIF encoding: [gifenc](https://github.com/mattdesl/gifenc) by Matt DesLauriers, MIT
- Inspired by Project Blinkenlights by the Chaos Computer Club, 2001

## Roadmap

- Hardware output adapter: send rendered frames to a real LED matrix, for example over WebSocket or WebSerial. `RenderService.renderFrame()` is already a pure frame → grid function and is the place to hook this in.
- Interactive mode in the spirit of the original's phone-controlled games and "love letters", controlled by keyboard here.
