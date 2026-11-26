import { Injectable, inject } from '@angular/core';
import { Position, Size } from '../interfaces/grid.interface';
import { Frame, FrameObject, TextObject } from '../interfaces/frame.interface';
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
}
