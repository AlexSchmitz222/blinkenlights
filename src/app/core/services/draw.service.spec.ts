import { TestBed } from '@angular/core/testing';
import { DrawService } from './draw.service';
import { GridService } from './grid.service';
import { Grid } from '../interfaces/grid.interface';
import { Shape } from '../interfaces/shape.interface';
import { PixelOutOfBoundsError } from '../errors/PixelOutOfBounds.error';
import { ShapeOutOfBoundsError } from '../errors/ShapeOutOfBounds.error';
import { ShapePixelOutOfBoundsError } from '../errors/ShapePixelOutOfBounds.error';

/** Renders a grid as rows of '#' (on) and '.' (off) for readable assertions. */
function ascii(grid: Grid): string[] {
  return grid.pixels.map(row => row.map(p => (p.active ? '#' : '.')).join(''));
}

describe('DrawService', () => {
  let draw: DrawService;
  let grids: GridService;
  let grid: Grid;

  // 2×2 L-shape with one explicitly-off pixel and one unlisted (transparent) pixel
  const shape: Shape = {
    id: 'l',
    description: '',
    size: { width: 2, height: 2 },
    pattern: [
      { position: { x: 0, y: 0 }, active: true },
      { position: { x: 0, y: 1 }, active: true },
      { position: { x: 1, y: 1 }, active: true },
    ],
    inverted: false,
  };

  beforeEach(() => {
    draw = TestBed.inject(DrawService);
    grids = TestBed.inject(GridService);
    grid = grids.generateEmptyGrid('g', { width: 5, height: 4 });
  });

  describe('drawPixel', () => {
    it('sets, clears and inverts pixels', () => {
      draw.drawPixel(grid, 4, 3, true);
      expect(grid.pixels[3][4].active).toBe(true);
      draw.drawPixel(grid, 4, 3, 'invert');
      expect(grid.pixels[3][4].active).toBe(false);
      draw.drawPixel(grid, 4, 3, 'invert');
      draw.drawPixel(grid, 4, 3, false);
      expect(grid.pixels[3][4].active).toBe(false);
    });

    it('throws outside the grid', () => {
      expect(() => draw.drawPixel(grid, 5, 0, true)).toThrowError(PixelOutOfBoundsError);
    });

    it('silently skips outside the grid when clipping', () => {
      expect(() => draw.drawPixel(grid, 5, 0, true, { clip: true })).not.toThrow();
      expect(ascii(grid).join('')).not.toContain('#');
    });
  });

  describe('drawLine', () => {
    it('draws a diagonal line including both endpoints', () => {
      draw.drawLine(grid, 0, 0, 3, 3, true);
      expect(ascii(grid)).toEqual(['#....', '.#...', '..#..', '...#.']);
    });

    it('draws a single pixel when start equals end', () => {
      draw.drawLine(grid, 2, 2, 2, 2, true);
      expect(ascii(grid)[2]).toBe('..#..');
    });
  });

  describe('drawRectangle', () => {
    it('fills a rectangle that touches the last row and column', () => {
      draw.drawRectangle(grid, 2, 1, 3, 3, true, true);
      expect(ascii(grid)).toEqual(['.....', '..###', '..###', '..###']);
    });

    it('leaves the inside of an unfilled rectangle untouched', () => {
      draw.drawPixel(grid, 2, 2, true);
      draw.drawRectangle(grid, 1, 1, 3, 3, true, false);
      expect(ascii(grid)).toEqual(['.....', '.###.', '.###.', '.###.']);

      draw.drawPixel(grid, 2, 2, false);
      draw.drawRectangle(grid, 1, 1, 3, 3, true, false);
      expect(ascii(grid)[2]).toBe('.#.#.');
    });

    it('throws when the rectangle does not fit', () => {
      expect(() => draw.drawRectangle(grid, 3, 0, 3, 1, true, true)).toThrowError(ShapeOutOfBoundsError);
    });
  });

  describe('drawShape', () => {
    it('draws active pattern pixels and keeps unlisted pixels transparent', () => {
      draw.drawPixel(grid, 2, 0, true); // sits under the unlisted (1,0) cell of the shape at x=1
      draw.drawShape(grid, 1, 0, shape);
      expect(ascii(grid).slice(0, 2)).toEqual(['.##..', '.##..']);
    });

    it('draws the inverted bounding box', () => {
      draw.drawShape(grid, 0, 0, shape, true);
      expect(ascii(grid).slice(0, 2)).toEqual(['.#...', '.....']);
    });

    it('fits exactly into the bottom-right corner', () => {
      expect(() => draw.drawShape(grid, 3, 2, shape)).not.toThrow();
    });

    it('throws when it does not fit, unless clipping', () => {
      expect(() => draw.drawShape(grid, 4, 3, shape)).toThrowError(ShapeOutOfBoundsError);
      draw.drawShape(grid, 4, 3, shape, false, { clip: true });
      expect(ascii(grid)[3]).toBe('....#');
    });

    it('clips shapes that start left of / above the grid', () => {
      draw.drawShape(grid, -1, -1, shape, false, { clip: true });
      expect(ascii(grid)[0]).toBe('#....');
    });

    it('rejects patterns with pixels outside the shape size', () => {
      const broken: Shape = { ...shape, pattern: [{ position: { x: 2, y: 0 }, active: true }] };
      expect(() => draw.drawShape(grid, 0, 0, broken)).toThrowError(ShapePixelOutOfBoundsError);
    });
  });
});
