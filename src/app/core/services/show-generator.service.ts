import { Injectable, inject } from '@angular/core';
import { Grid, Position, Size } from '../interfaces/grid.interface';
import { BitmapObject, Frame, FrameObject, TextObject } from '../interfaces/frame.interface';
import { TextDrawService } from './text-draw.service';
import { createId } from '../utils/id';

export interface ScrollTextOptions {
  /** Pixel font (default 'regular'). */
  font?: 'regular' | 'small';
  /** Cap line of the text. Defaults to vertically centred. */
  y?: number;
  /** ms per one-pixel step. */
  stepDuration?: number;
  spacing?: number;
  inverted?: boolean;
  direction?: 'left' | 'right';
  /** Objects drawn on every frame underneath the text (e.g. a frame or a background shape). */
  background?: FrameObject[];
}

/** Builds frame sequences for common animations, so nobody has to place 60 frames by hand. */
@Injectable({
  providedIn: 'root'
})
export class ShowGeneratorService {
  private text = inject(TextDrawService);

  /** Text that enters on one side and fully leaves on the other, one pixel per frame. */
  scrollText(text: string, gridSize: Size, options: ScrollTextOptions = {}): Frame[] {
    const width = this.text.measureText(text, { font: options.font, spacing: options.spacing }).width;
    const y = options.y ?? Math.floor((gridSize.height - this.text.capHeightOf(options.font)) / 2);
    const stepDuration = options.stepDuration ?? 80;
    const objectId = createId('obj');
    const pad = options.inverted ? 1 : 0;

    const start = options.direction === 'right' ? -width - pad : gridSize.width + pad;
    const end = options.direction === 'right' ? gridSize.width + pad : -width - pad;
    const step = start < end ? 1 : -1;

    const frames: Frame[] = [];
    for (let x = start; x !== end + step; x += step) {
      const textObject: TextObject = {
        id: objectId,
        type: 'text',
        text,
        position: { x, y },
        spacing: options.spacing,
        inverted: options.inverted,
        ...(options.font && options.font !== 'regular' ? { font: options.font } : {}),
      };
      frames.push({
        id: createId('frame'),
        duration: stepDuration,
        objects: [...structuredClone(options.background ?? []), textObject],
      });
    }
    return frames;
  }

  /** Moves an object in a straight line. Produces `steps + 1` frames (start and end included). */
  moveObject(object: FrameObject, to: Position, steps: number, stepDuration = 80, background: FrameObject[] = []): Frame[] {
    const from = object.position;
    const count = Math.max(1, Math.round(steps));
    const frames: Frame[] = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      frames.push({
        id: createId('frame'),
        duration: stepDuration,
        objects: [
          ...structuredClone(background),
          {
            ...structuredClone(object),
            position: { x: Math.round(from.x + (to.x - from.x) * t), y: Math.round(from.y + (to.y - from.y) * t) },
          },
        ],
      });
    }
    return frames;
  }

  /** Alternates between showing the objects and an empty (or inverted) frame. */
  blink(objects: FrameObject[], times: number, onDuration = 400, offDuration = 400, mode: 'off' | 'invert' = 'off'): Frame[] {
    const frames: Frame[] = [];
    for (let i = 0; i < times; i++) {
      frames.push({ id: createId('frame'), duration: onDuration, objects: structuredClone(objects) });
      frames.push({
        id: createId('frame'),
        duration: offDuration,
        objects: mode === 'invert' ? structuredClone(objects).map(o => ({ ...o, inverted: !o.inverted })) : [],
      });
    }
    return frames;
  }

  /**
   * Text that appears one character at a time (spaces don't get their own frame).
   * The text stays where it will end up, centred like the finished text.
   */
  typewriter(text: string, gridSize: Size, options: TypewriterOptions = {}): Frame[] {
    const font = options.font ?? 'regular';
    const full = this.text.measureText(text, { font, spacing: options.spacing });
    const x = options.x ?? Math.max(0, Math.floor((gridSize.width - full.width) / 2));
    const y = options.y ?? Math.max(0, Math.floor((gridSize.height - full.height + (font === 'regular' ? 1 : 0)) / 2));
    const stepDuration = options.stepDuration ?? 120;
    const objectId = createId('obj');
    const chars = [...text];

    const frames: Frame[] = [];
    for (let i = 1; i <= chars.length; i++) {
      if (/\s/.test(chars[i - 1]) && i < chars.length) continue; // whitespace appears together with the next letter
      const textObject: TextObject = {
        id: objectId,
        type: 'text',
        text: chars.slice(0, i).join(''),
        position: { x, y },
        spacing: options.spacing,
        ...(font !== 'regular' ? { font } : {}),
      };
      frames.push({
        id: createId('frame'),
        duration: i === chars.length ? (options.holdDuration ?? 1000) : stepDuration,
        objects: [...structuredClone(options.background ?? []), textObject],
      });
    }
    return frames;
  }

  /**
   * Random lights flashing on top of the background. `density` is the share of lit pixels per frame
   * (0–1). A seed makes the result repeatable.
   */
  sparkle(gridSize: Size, options: SparkleOptions = {}): Frame[] {
    const count = Math.max(1, Math.round(options.frames ?? 12));
    const density = Math.min(1, Math.max(0, options.density ?? 0.08));
    const random = seededRandom(options.seed ?? Date.now());
    const frames: Frame[] = [];
    for (let f = 0; f < count; f++) {
      const rows = Array.from({ length: gridSize.height }, () =>
        Array.from({ length: gridSize.width }, () => (random() < density ? '1' : '0')).join(''),
      );
      const sparkles: BitmapObject = {
        id: createId('obj'),
        type: 'bitmap',
        position: { x: 0, y: 0 },
        size: { ...gridSize },
        rows,
        transparent: true,
      };
      frames.push({
        id: createId('frame'),
        duration: options.stepDuration ?? 100,
        objects: [...structuredClone(options.background ?? []), sparkles],
      });
    }
    return frames;
  }

  /**
   * The in-between frames of a wipe from one picture to another: the new picture pushes in line by
   * line from one side. The start and end pictures themselves are not included.
   */
  wipe(from: Grid, to: Grid, options: WipeOptions = {}): Frame[] {
    const direction = options.direction ?? 'left';
    const { width, height } = from.size;
    const horizontal = direction === 'left' || direction === 'right';
    const steps = horizontal ? width : height;
    const frames: Frame[] = [];
    for (let k = 1; k < steps; k++) {
      const rows: string[] = [];
      for (let y = 0; y < height; y++) {
        let row = '';
        for (let x = 0; x < width; x++) {
          // how far the edge has moved in, measured from the side the wipe starts at
          const pos = direction === 'left' ? x : direction === 'right' ? width - 1 - x : direction === 'top' ? y : height - 1 - y;
          const source = pos < k ? to : from;
          row += source.pixels[y]?.[x]?.active === true ? '1' : '0';
        }
        rows.push(row);
      }
      frames.push({
        id: createId('frame'),
        duration: options.stepDuration ?? 40,
        objects: [{ id: createId('obj'), type: 'bitmap', position: { x: 0, y: 0 }, size: { width, height }, rows }],
      });
    }
    return frames;
  }
}

export interface TypewriterOptions {
  font?: 'regular' | 'small';
  x?: number;
  y?: number;
  spacing?: number;
  /** ms per letter. */
  stepDuration?: number;
  /** How long the finished text stays, in ms. */
  holdDuration?: number;
  background?: FrameObject[];
}

export interface SparkleOptions {
  frames?: number;
  /** Share of lit pixels per frame, 0–1. */
  density?: number;
  stepDuration?: number;
  seed?: number;
  background?: FrameObject[];
}

export interface WipeOptions {
  /** The side the new picture comes in from. */
  direction?: 'left' | 'right' | 'top' | 'bottom';
  stepDuration?: number;
}

/** Small, fast, seedable pseudo-random generator (mulberry32). */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
