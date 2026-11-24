import { Injectable, inject } from '@angular/core';
import { pixelState } from '../interfaces/pixel.interface';
import { GridService } from './grid.service';
import { Grid } from '../interfaces/grid.interface';
import { Shape } from '../interfaces/shape.interface';
import { ShapeOutOfBoundsError } from '../errors/ShapeOutOfBounds.error';
import { PixelOutOfBoundsError } from '../errors/PixelOutOfBounds.error';
import { ShapePixelOutOfBoundsError } from '../errors/ShapePixelOutOfBounds.error';

export interface DrawOptions {
  /**
   * When true, pixels that fall outside the grid are silently skipped instead of throwing.
   * Needed for anything that moves partially off-screen (scrolling text, objects flying in).
   */
  clip?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DrawService {
  private gridService = inject(GridService);

  drawPixel(grid: Grid, x: number, y: number, active: pixelState, options: DrawOptions = {}) {
    if (!this.gridService.checkPixelIsOnGrid(grid, x, y)) {
      if (options.clip) return;
      throw new PixelOutOfBoundsError(grid.size, { x, y });
    }

    const pixel = this.gridService.getPixelData(grid, x, y);
    pixel.active = active === 'invert' ? !pixel.active : active;
  }

  drawLine(grid: Grid, x1: number, y1: number, x2: number, y2: number, active: pixelState, options: DrawOptions = {}) {
    if (!options.clip && (!this.gridService.checkPixelIsOnGrid(grid, x1, y1) || !this.gridService.checkPixelIsOnGrid(grid, x2, y2))) {
      throw new ShapeOutOfBoundsError('Shape_Line', grid.size, { x: x1, y: y1 }, undefined, { x: x2, y: y2 });
    }

    // Bresenham
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let x = x1;
    let y = y1;

    while (true) {
      this.drawPixel(grid, x, y, active, options);
      if (x === x2 && y === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  /** Draws a rectangle. Unfilled rectangles only draw the outline and leave the inside untouched. */
  drawRectangle(grid: Grid, x1: number, y1: number, width: number, height: number, active: pixelState, filled: boolean, options: DrawOptions = {}) {
    if (!options.clip && !this.fitsOnGrid(grid, x1, y1, width, height)) {
      throw new ShapeOutOfBoundsError('Shape_Rect', grid.size, { x: x1, y: y1 }, { width, height });
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isEdge = y === 0 || y === height - 1 || x === 0 || x === width - 1;
        if (filled || isEdge) {
          this.drawPixel(grid, x1 + x, y1 + y, active, options);
        }
      }
    }
  }

  /**
   * Draws a shape with its top-left corner at (x, y).
   *
   * Normal: pattern pixels are applied as stored, pixels not in the pattern are left untouched (transparent).
   * Inverted: the shape's whole bounding box is drawn, with active pattern pixels cut out (off) and everything else on.
   */
  drawShape(grid: Grid, x: number, y: number, shape: Shape, inverted = false, options: DrawOptions = {}) {
    if (!options.clip && !this.fitsOnGrid(grid, x, y, shape.size.width, shape.size.height)) {
      throw new ShapeOutOfBoundsError(`Shape_Custom:${shape.id}`, grid.size, { x, y }, shape.size);
    }

    const outside = shape.pattern.find(p => p.position.x >= shape.size.width || p.position.y >= shape.size.height);
    if (outside) {
      throw new ShapePixelOutOfBoundsError(`Shape_Custom:${shape.id}`, shape.size, outside.position);
    }

    if (!inverted) {
      for (const pixel of shape.pattern) {
        this.drawPixel(grid, x + pixel.position.x, y + pixel.position.y, pixel.active, options);
      }
      return;
    }

    const lookup = new Map(shape.pattern.map(p => [`${p.position.x},${p.position.y}`, p.active]));
    for (let sy = 0; sy < shape.size.height; sy++) {
      for (let sx = 0; sx < shape.size.width; sx++) {
        const state = lookup.get(`${sx},${sy}`);
        const drawn: pixelState = state === 'invert' ? 'invert' : !state;
        this.drawPixel(grid, x + sx, y + sy, drawn, options);
      }
    }
  }

  private fitsOnGrid(grid: Grid, x: number, y: number, width: number, height: number): boolean {
    return this.gridService.checkPixelIsOnGrid(grid, x, y)
      && this.gridService.checkPixelIsOnGrid(grid, x + width - 1, y + height - 1);
  }
}
