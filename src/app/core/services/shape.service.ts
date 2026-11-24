import { Injectable } from '@angular/core';
import { Shape } from '../interfaces/shape.interface';
import { Grid, Size } from '../interfaces/grid.interface';
import { Pixel } from '../interfaces/pixel.interface';

/** Pure helpers to convert and transform shapes. None of these mutate their input. */
@Injectable({
  providedIn: 'root'
})
export class ShapeService {

  /** Smallest size that still contains every active pixel of the shape. */
  getShapeRequiredSize(shape: Shape): Size {
    let width = 0;
    let height = 0;
    for (const pixel of shape.pattern) {
      if (!pixel.active) continue;
      width = Math.max(width, pixel.position.x + 1);
      height = Math.max(height, pixel.position.y + 1);
    }
    return { width, height };
  }

  /** Returns a dense pattern with exactly one pixel per cell of `size` (missing cells become inactive). */
  toDensePattern(pattern: Pixel[], size: Size): Pixel[] {
    const lookup = this.lookup(pattern);
    const dense: Pixel[] = [];
    for (let y = 0; y < size.height; y++) {
      for (let x = 0; x < size.width; x++) {
        dense.push({ position: { x, y }, active: lookup.get(`${x},${y}`) ?? false });
      }
    }
    return dense;
  }

  /** Returns only the active pixels of a pattern (the compact form used for storage). */
  toSparsePattern(pattern: Pixel[]): Pixel[] {
    return pattern
      .filter(pixel => pixel.active)
      .map(pixel => ({ position: { x: pixel.position.x, y: pixel.position.y }, active: pixel.active }));
  }

  /** Flips every pixel inside the shape's bounds. */
  invertShape(shape: Shape): Shape {
    return {
      ...shape,
      size: { ...shape.size },
      pattern: this.toDensePattern(shape.pattern, shape.size).map(pixel => ({ ...pixel, active: !pixel.active })),
      inverted: !shape.inverted,
    };
  }

  transformShapeToGrid(shape: Shape, gridId: string = shape.id, gridDescription: string = shape.description): Grid {
    const lookup = this.lookup(shape.pattern);
    const pixels: Pixel[][] = [];
    let count = 0;
    for (let y = 0; y < shape.size.height; y++) {
      const row: Pixel[] = [];
      for (let x = 0; x < shape.size.width; x++) {
        row.push({ id: (count++).toString(), position: { x, y }, active: lookup.get(`${x},${y}`) ?? false });
      }
      pixels.push(row);
    }

    return {
      id: gridId,
      description: gridDescription,
      size: { width: shape.size.width, height: shape.size.height },
      pixels,
      inverted: shape.inverted,
    };
  }

  transformGridToShape(grid: Grid, shapeId: string, shapeDescription: string): Shape {
    return {
      id: shapeId,
      description: shapeDescription,
      size: { width: grid.size.width, height: grid.size.height },
      pattern: this.toSparsePattern(grid.pixels.flat()),
      inverted: grid.inverted,
    };
  }

  private lookup(pattern: Pixel[]): Map<string, Pixel['active']> {
    return new Map(pattern.map(p => [`${p.position.x},${p.position.y}`, p.active]));
  }
}
