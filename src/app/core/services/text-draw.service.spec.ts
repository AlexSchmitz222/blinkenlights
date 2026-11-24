import { TestBed } from '@angular/core/testing';
import { TextDrawService } from './text-draw.service';
import { GridService } from './grid.service';
import { FONT_CAP_HEIGHT, FONT_GLYPHS } from '../../shapes/characters.shapes';
import { Grid } from '../interfaces/grid.interface';

function ascii(grid: Grid): string[] {
  return grid.pixels.map(row => row.map(p => (p.active ? '#' : '.')).join(''));
}

describe('TextDrawService', () => {
  let text: TextDrawService;
  let grids: GridService;

  beforeEach(() => {
    text = TestBed.inject(TextDrawService);
    grids = TestBed.inject(GridService);
  });

  describe('font', () => {
    for (const [char, rows] of Object.entries(FONT_GLYPHS)) {
      it(`glyph "${char}" is well-formed`, () => {
        expect(rows.length, 'height').toBeGreaterThanOrEqual(FONT_CAP_HEIGHT);
        expect(rows.length, 'height').toBeLessThanOrEqual(FONT_CAP_HEIGHT + 1);
        expect(new Set(rows.map(r => r.length)).size, 'all rows same width').toBe(1);
        expect(rows.join('')).toMatch(/^[#.]+$/);
      });
    }

    it('covers letters, digits, umlauts and common punctuation', () => {
      const required = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÄÖÜäöüß .,:;!?-+=()/\'"';
      const missing = [...required].filter(c => !text.hasCharacter(c));
      expect(missing).toEqual([]);
    });

    it('marks descender letters', () => {
      expect(text.getCharacter('g').heightOffset).toBe(1);
      expect(text.getCharacter('a').heightOffset).toBe(0);
    });
  });

  it('measures text with spacing and descender row', () => {
    // H(5) + 1 + i(3) = 9 wide, one line = 8 tall
    expect(text.measureText('Hi')).toEqual({ width: 9, height: 8 });
    expect(text.measureText('Hi', { spacing: 0 })).toEqual({ width: 8, height: 8 });
    expect(text.measureText('')).toEqual({ width: 0, height: 8 });
  });

  it('measures multiple lines', () => {
    expect(text.measureText('HI\nH')).toEqual({ width: 9, height: 17 });
  });

  it('fits three capitals onto the original 18×8 Blinkenlights grid', () => {
    const size = text.measureText('HEY');
    expect(size).toEqual({ width: 17, height: 8 });
  });

  it('draws characters next to each other', () => {
    const grid = grids.generateEmptyGrid('g', { width: 9, height: 8 });
    text.drawText(grid, 0, 0, 'HI');
    expect(ascii(grid)[0]).toBe('#...#.###');
    expect(ascii(grid)[3]).toBe('#####..#.');
  });

  it('draws descenders below the baseline', () => {
    const grid = grids.generateEmptyGrid('g', { width: 5, height: 8 });
    text.drawText(grid, 0, 0, 'g');
    expect(ascii(grid)[7]).toBe('.###.');
  });

  it('clips text that scrolls off the grid', () => {
    const grid = grids.generateEmptyGrid('g', { width: 4, height: 8 });
    expect(() => text.drawText(grid, -3, 0, 'HELLO', { clip: true })).not.toThrow();
    expect(ascii(grid)[3]).toBe('##.#'); // right half of H, then E
  });

  it('draws unknown characters as a box', () => {
    const grid = grids.generateEmptyGrid('g', { width: 5, height: 8 });
    text.drawText(grid, 0, 0, '☃');
    expect(ascii(grid)[0]).toBe('#####');
    expect(ascii(grid)[1]).toBe('#...#');
  });

  it('draws inverted text as a lit box with letters cut out', () => {
    const shape = text.textToShape('I', { inverted: true });
    expect(shape.size).toEqual({ width: 5, height: 10 });
    const grid = grids.generateEmptyGrid('g', shape.size);
    shape.pattern.forEach(p => (grid.pixels[p.position.y][p.position.x].active = true));
    expect(ascii(grid)[0]).toBe('#####');
    expect(ascii(grid)[1]).toBe('#...#'); // top bar of the I is cut out
  });

  it('converts text to a shape', () => {
    const shape = text.textToShape('A');
    expect(shape.size).toEqual({ width: 5, height: 8 });
    expect(shape.pattern.length).toBe(18);
  });
});
