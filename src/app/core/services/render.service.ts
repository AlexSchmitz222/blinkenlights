import { Injectable, inject } from '@angular/core';
import { Grid, Size } from '../interfaces/grid.interface';
import { Frame, FrameObject } from '../interfaces/frame.interface';
import { Shape } from '../interfaces/shape.interface';
import { DrawService } from './draw.service';
import { seededRandom } from '../utils/random';
import { GridService } from './grid.service';
import { TextDrawService } from './text-draw.service';

export type ShapeResolver = (shapeId: string) => Shape | undefined;

export interface ObjectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Turns frames into grids. Pure: the same frame always renders the same pixels, so this is also the
 * place a hardware output could hook into later.
 */
@Injectable({
  providedIn: 'root'
})
export class RenderService {
  private draw = inject(DrawService);
  private grids = inject(GridService);
  private text = inject(TextDrawService);

  renderFrame(frame: Frame | null | undefined, size: Size, resolveShape: ShapeResolver): Grid {
    const grid = this.grids.generateEmptyGrid(frame?.id ?? '', size);
    for (const object of frame?.objects ?? []) {
      this.drawObject(grid, object, resolveShape);
    }
    return grid;
  }

  drawObject(grid: Grid, object: FrameObject, resolveShape: ShapeResolver) {
    const { x, y } = object.position;
    switch (object.type) {
      case 'shape': {
        const shape = resolveShape(object.shapeId);
        if (shape) this.draw.drawShape(grid, x, y, shape, object.inverted ?? false, { clip: true });
        break;
      }
      case 'text':
        this.text.drawText(grid, x, y, object.text, { font: object.font, spacing: object.spacing, inverted: object.inverted, clip: true });
        break;
      case 'sparkle': {
        // the same order of random numbers on every device: row by row over the whole grid
        const random = seededRandom(object.seed);
        for (let py = 0; py < grid.size.height; py++) {
          for (let px = 0; px < grid.size.width; px++) {
            if (random() < object.density) this.draw.drawPixel(grid, px, py, true);
          }
        }
        break;
      }
      case 'bitmap':
        object.rows.forEach((row, dy) => {
          for (let dx = 0; dx < row.length; dx++) {
            const lit = row[dx] === '1';
            if (object.transparent && !lit) continue;
            this.draw.drawPixel(grid, x + dx, y + dy, object.inverted ? !lit : lit, { clip: true });
          }
        });
        break;
    }
  }

  /** The area an object covers (used for selection highlights in the editor). */
  getBounds(object: FrameObject, resolveShape: ShapeResolver): ObjectBounds {
    const { x, y } = object.position;
    switch (object.type) {
      case 'shape': {
        const size = resolveShape(object.shapeId)?.size ?? { width: 1, height: 1 };
        return { x, y, ...size };
      }
      case 'text': {
        const size = this.text.measureText(object.text, { font: object.font, spacing: object.spacing });
        const pad = object.inverted ? 1 : 0;
        return { x: x - pad, y: y - pad, width: Math.max(1, size.width) + 2 * pad, height: size.height + 2 * pad };
      }
      case 'bitmap':
        return { x, y, ...object.size };
      case 'sparkle':
        // covers the whole grid; no area on purpose, so clicks on the stage reach the objects below
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }
}
