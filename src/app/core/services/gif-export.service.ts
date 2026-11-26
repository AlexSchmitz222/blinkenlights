import { Injectable, inject } from '@angular/core';
// gifenc ships an ES module build but doesn't declare it in package.json, so import it directly.
import { GIFEncoder, Palette } from 'gifenc/dist/gifenc.esm.js';
import { Show } from '../interfaces/show.interface';
import { Grid, Size } from '../interfaces/grid.interface';
import { RenderService, ShapeResolver } from './render.service';

export type GifStyle = 'facade' | 'pixels';

export interface GifOptions {
  style: GifStyle;
  /** Size of one light in GIF pixels. */
  cellSize: number;
}

/** How long a "hold" frame (duration 0) is shown in the GIF, which can't wait for a click. */
export const GIF_HOLD_DURATION = 2000;
/** Browsers play shorter GIF delays much slower (often as 100 ms), so never go below this. */
export const GIF_MIN_DELAY = 20;

// Colour indices into the palettes below.
const BG = 0;
const FRAME = 1;
const OFF = 2;
const ON = 3;
const ON_CENTER = 4;

const PALETTES: Record<GifStyle, Palette> = {
  // the always-dark stage of the player
  pixels: [[10, 10, 11], [10, 10, 11], [27, 27, 30], [255, 227, 163], [255, 236, 190]],
  // the house front: wall, window frame, dark window, lit window, brighter centre of a lit window
  facade: [[42, 38, 34], [25, 22, 20], [13, 13, 16], [255, 210, 122], [255, 241, 201]],
};

interface Layout {
  width: number;
  height: number;
  /** Top-left corner of the light at (x, y). */
  origin(x: number, y: number): { left: number; top: number };
  cellWidth: number;
  cellHeight: number;
  frame: number;
}

/**
 * Renders a show into an animated GIF. Frames are drawn straight into colour-index buffers (no canvas),
 * so this runs anywhere, including in unit tests.
 */
@Injectable({ providedIn: 'root' })
export class GifExportService {
  private render = inject(RenderService);

  /** The pixel size of the GIF for a grid size, e.g. to show it before exporting. */
  measure(size: Size, options: GifOptions): Size {
    const { width, height } = this.layout(size, options);
    return { width, height };
  }

  encode(show: Show, resolveShape: ShapeResolver, options: GifOptions): Uint8Array {
    const layout = this.layout(show.size, options);
    const palette = PALETTES[options.style];
    const frames = show.scenes.flatMap(scene => scene.frames);

    // Render all frames and merge consecutive identical ones (common in generated animations).
    const merged: { pixels: Uint8Array; delay: number }[] = [];
    for (const frame of frames) {
      const grid = this.render.renderFrame(frame, show.size, resolveShape);
      const pixels = this.draw(grid, layout, options.style);
      const delay = frame.duration === 0 ? GIF_HOLD_DURATION : frame.duration;
      const previous = merged.at(-1);
      if (previous && sameBytes(previous.pixels, pixels)) previous.delay += delay;
      else merged.push({ pixels, delay });
    }
    if (merged.length === 0) {
      merged.push({ pixels: this.draw(this.render.renderFrame(null, show.size, resolveShape), layout, options.style), delay: 1000 });
    }

    const gif = GIFEncoder();
    merged.forEach((frame, i) => {
      gif.writeFrame(frame.pixels, layout.width, layout.height, {
        palette: i === 0 ? palette : undefined,
        delay: Math.max(GIF_MIN_DELAY, frame.delay),
        repeat: show.loop ? 0 : -1,
      });
    });
    gif.finish();
    return gif.bytes();
  }

  private layout(size: Size, { style, cellSize }: GifOptions): Layout {
    const c = Math.max(2, Math.round(cellSize));
    if (style === 'pixels') {
      const gap = Math.max(1, Math.round(c * 0.14));
      const pad = c;
      return {
        width: pad * 2 + size.width * c + (size.width - 1) * gap,
        height: pad * 2 + size.height * c + (size.height - 1) * gap,
        origin: (x, y) => ({ left: pad + x * (c + gap), top: pad + y * (c + gap) }),
        cellWidth: c,
        cellHeight: c,
        frame: 0,
      };
    }
    // facade: taller windows with a frame, more wall between them
    const cellWidth = c;
    const cellHeight = Math.round(c * 1.25);
    const frame = Math.max(1, Math.round(c * 0.1));
    const gapX = Math.max(2, Math.round(c * 0.55));
    const gapY = Math.max(2, Math.round(c * 0.45));
    const pad = Math.round(c * 1.5);
    return {
      width: pad * 2 + size.width * cellWidth + (size.width - 1) * gapX,
      height: pad * 2 + size.height * cellHeight + (size.height - 1) * gapY,
      origin: (x, y) => ({ left: pad + x * (cellWidth + gapX), top: pad + y * (cellHeight + gapY) }),
      cellWidth,
      cellHeight,
      frame,
    };
  }

  private draw(grid: Grid, layout: Layout, style: GifStyle): Uint8Array {
    const { width } = layout;
    const pixels = new Uint8Array(layout.width * layout.height).fill(BG);
    const rect = (left: number, top: number, w: number, h: number, color: number) => {
      for (let y = top; y < top + h; y++) pixels.fill(color, y * width + left, y * width + left + w);
    };

    for (const row of grid.pixels) {
      for (const pixel of row) {
        const { left, top } = layout.origin(pixel.position.x, pixel.position.y);
        const on = pixel.active === true;
        const { cellWidth: w, cellHeight: h, frame: f } = layout;
        if (style === 'facade') {
          rect(left - f, top - f, w + 2 * f, h + 2 * f, FRAME);
          rect(left, top, w, h, on ? ON : OFF);
          if (on && w >= 6) {
            // a brighter centre makes lit windows glow a little
            const iw = Math.round(w * 0.5);
            const ih = Math.round(h * 0.45);
            rect(left + Math.floor((w - iw) / 2), top + Math.floor((h - ih) / 2.6), iw, ih, ON_CENTER);
          }
        } else {
          rect(left, top, w, h, on ? ON : OFF);
          if (w >= 6) {
            // cut the corners for a rounded look
            for (const [dx, dy] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
              pixels[(top + dy) * width + left + dx] = BG;
            }
          }
        }
      }
    }
    return pixels;
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
