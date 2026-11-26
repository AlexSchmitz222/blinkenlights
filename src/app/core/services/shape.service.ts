import { Injectable } from '@angular/core';
import { Shape } from '../interfaces/shape.interface';
import { Grid, Position, Size } from '../interfaces/grid.interface';
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

  /** Moves all pixels by (dx, dy); pixels leaving one edge wrap around to the other, so nothing is lost. */
  shiftShape(shape: Shape, dx: number, dy: number): Shape {
    const { width, height } = shape.size;
    return this.mapPixels(shape, ({ x, y }) => ({
      x: (((x + dx) % width) + width) % width,
      y: (((y + dy) % height) + height) % height,
    }));
  }

  flipShape(shape: Shape, axis: 'horizontal' | 'vertical'): Shape {
    const { width, height } = shape.size;
    return this.mapPixels(shape, ({ x, y }) =>
      axis === 'horizontal' ? { x: width - 1 - x, y } : { x, y: height - 1 - y },
    );
  }

  /** Returns a copy with pixel (x, y) set on or off. */
  setPixel(shape: Shape, x: number, y: number, on: boolean): Shape {
    const pattern = shape.pattern.filter(p => p.position.x !== x || p.position.y !== y);
    if (on) pattern.push({ position: { x, y }, active: true });
    return { ...shape, pattern };
  }

  isPixelOn(shape: Shape, x: number, y: number): boolean {
    return shape.pattern.some(p => p.position.x === x && p.position.y === y && p.active === true);
  }

  /** Returns a copy with all given pixels set on or off. Points outside the shape are ignored. */
  setPixels(shape: Shape, points: Position[], on: boolean): Shape {
    const inside = points.filter(p => p.x >= 0 && p.y >= 0 && p.x < shape.size.width && p.y < shape.size.height);
    const keys = new Set(inside.map(p => `${p.x},${p.y}`));
    const pattern = shape.pattern.filter(p => !keys.has(`${p.position.x},${p.position.y}`));
    if (on) {
      for (const key of keys) {
        const [x, y] = key.split(',').map(Number);
        pattern.push({ position: { x, y }, active: true });
      }
    }
    return { ...shape, pattern };
  }

  /** The pixels of a straight line from (x1, y1) to (x2, y2), both ends included (Bresenham). */
  linePoints(x1: number, y1: number, x2: number, y2: number): Position[] {
    const points: Position[] = [];
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let x = x1;
    let y = y1;
    while (true) {
      points.push({ x, y });
      if (x === x2 && y === y2) return points;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  /** The pixels of the rectangle spanned by two corners (in any order): outline or filled. */
  rectPoints(x1: number, y1: number, x2: number, y2: number, filled: boolean): Position[] {
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    const points: Position[] = [];
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (filled || y === top || y === bottom || x === left || x === right) points.push({ x, y });
      }
    }
    return points;
  }

  /**
   * The connected area (4-neighbourhood) of pixels that are in the same state as (x, y), within the
   * shape's bounds — what a paint bucket would fill.
   */
  fillRegion(shape: Shape, x: number, y: number): Position[] {
    const { width, height } = shape.size;
    if (x < 0 || y < 0 || x >= width || y >= height) return [];
    const lit = new Set(shape.pattern.filter(p => p.active === true).map(p => `${p.position.x},${p.position.y}`));
    const target = lit.has(`${x},${y}`);
    const seen = new Set<string>();
    const region: Position[] = [];
    const stack: Position[] = [{ x, y }];
    while (stack.length) {
      const p = stack.pop()!;
      const key = `${p.x},${p.y}`;
      if (p.x < 0 || p.y < 0 || p.x >= width || p.y >= height || seen.has(key) || lit.has(key) !== target) continue;
      seen.add(key);
      region.push(p);
      stack.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
    }
    return region;
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

  transformGridToShape(grid: Grid, meta: Pick<Shape, 'id' | 'name' | 'description'>): Shape {
    return {
      id: meta.id,
      name: meta.name,
      description: meta.description,
      size: { width: grid.size.width, height: grid.size.height },
      pattern: this.toSparsePattern(grid.pixels.flat()),
      inverted: grid.inverted,
    };
  }

  private mapPixels(shape: Shape, fn: (pos: { x: number; y: number }) => { x: number; y: number }): Shape {
    return {
      ...shape,
      pattern: shape.pattern.map(p => ({ ...p, position: fn(p.position) })),
    };
  }

  private lookup(pattern: Pixel[]): Map<string, Pixel['active']> {
    return new Map(pattern.map(p => [`${p.position.x},${p.position.y}`, p.active]));
  }
}
