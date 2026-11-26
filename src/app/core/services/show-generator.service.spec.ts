import { TestBed } from '@angular/core/testing';
import { ShowGeneratorService } from './show-generator.service';
import { TextObject, ShapeObject, BitmapObject } from '../interfaces/frame.interface';
import { GridService } from './grid.service';

describe('ShowGeneratorService', () => {
  let gen: ShowGeneratorService;

  beforeEach(() => {
    gen = TestBed.inject(ShowGeneratorService);
  });

  it('scrolls text in from the right until it has fully left on the left', () => {
    // "HI" is 9 px wide; on an 18 px grid: x = 18 … -9 → 28 frames
    const frames = gen.scrollText('HI', { width: 18, height: 8 }, { stepDuration: 50 });
    expect(frames.length).toBe(28);
    const xs = frames.map(f => (f.objects[0] as TextObject).position.x);
    expect(xs[0]).toBe(18);
    expect(xs.at(-1)).toBe(-9);
    expect(frames.every(f => f.duration === 50)).toBe(true);
    expect((frames[0].objects[0] as TextObject).position.y).toBe(0);
  });

  it('scrolls to the right and keeps background objects', () => {
    const bg: ShapeObject = { id: 'bg', type: 'shape', shapeId: 'star', position: { x: 0, y: 0 } };
    const frames = gen.scrollText('I', { width: 4, height: 9 }, { direction: 'right', background: [bg] });
    const xs = frames.map(f => (f.objects[1] as TextObject).position.x);
    expect(xs[0]).toBe(-3);
    expect(xs.at(-1)).toBe(4);
    expect(frames.every(f => f.objects[0].id === 'bg')).toBe(true);
    expect((frames[0].objects[1] as TextObject).position.y).toBe(1);
  });

  it('gives every frame its own id but keeps the object id stable', () => {
    const frames = gen.scrollText('A', { width: 3, height: 8 });
    expect(new Set(frames.map(f => f.id)).size).toBe(frames.length);
    expect(new Set(frames.map(f => f.objects[0].id)).size).toBe(1);
  });

  it('moves an object in a straight line', () => {
    const star: ShapeObject = { id: 'o', type: 'shape', shapeId: 'star', position: { x: 0, y: 0 } };
    const frames = gen.moveObject(star, { x: 10, y: 5 }, 5, 100);
    expect(frames.length).toBe(6);
    expect(frames.map(f => f.objects[0].position)).toEqual([
      { x: 0, y: 0 }, { x: 2, y: 1 }, { x: 4, y: 2 }, { x: 6, y: 3 }, { x: 8, y: 4 }, { x: 10, y: 5 },
    ]);
    expect(star.position).toEqual({ x: 0, y: 0 });
  });

  it('blinks objects off or inverted', () => {
    const star: ShapeObject = { id: 'o', type: 'shape', shapeId: 'star', position: { x: 0, y: 0 } };
    expect(gen.blink([star], 2).map(f => f.objects.length)).toEqual([1, 0, 1, 0]);
    const inverted = gen.blink([star], 1, 100, 200, 'invert');
    expect(inverted[1].objects[0].inverted).toBe(true);
    expect(inverted[1].duration).toBe(200);
  });

  it('scrolls small text, centred for its height', () => {
    const frames = gen.scrollText('HI', { width: 18, height: 8 }, { font: 'small' });
    const first = frames[0].objects[0] as TextObject;
    expect(first.font).toBe('small');
    expect(first.position.y).toBe(1); // (8 - 5) / 2
    expect(frames.length).toBe(18 + 7 + 1); // HI is 7 px wide in the small font
  });

  describe('typewriter', () => {
    it('adds one letter per frame, spaces together with the next letter, and holds the end', () => {
      const frames = gen.typewriter('HI YO', { width: 39, height: 21 }, { stepDuration: 100, holdDuration: 900 });
      expect(frames.map(f => (f.objects[0] as TextObject).text)).toEqual(['H', 'HI', 'HI Y', 'HI YO']);
      expect(frames.map(f => f.duration)).toEqual([100, 100, 100, 900]);
    });

    it('keeps the text at the position of the finished, centred text', () => {
      const frames = gen.typewriter('HI', { width: 19, height: 8 }); // HI = 9 px → x = 5
      expect(new Set(frames.map(f => JSON.stringify(f.objects[0].position)))).toEqual(new Set([JSON.stringify({ x: 5, y: 0 })]));
    });

    it('draws on top of a background and supports the small font', () => {
      const bg: ShapeObject = { id: 'bg', type: 'shape', shapeId: 'star', position: { x: 0, y: 0 } };
      const frames = gen.typewriter('AB', { width: 18, height: 8 }, { font: 'small', background: [bg] });
      expect(frames[0].objects[0].id).toBe('bg');
      expect((frames[1].objects[1] as TextObject).font).toBe('small');
    });
  });

  describe('sparkle', () => {
    it('creates the requested number of transparent overlay frames with roughly the requested density', () => {
      const frames = gen.sparkle({ width: 40, height: 25 }, { frames: 5, density: 0.1, seed: 42 });
      expect(frames.length).toBe(5);
      const bitmap = frames[0].objects[0] as BitmapObject;
      expect(bitmap.transparent).toBe(true);
      const lit = bitmap.rows.join('').split('').filter(c => c === '1').length;
      expect(lit).toBeGreaterThan(50); // ~100 of 1000
      expect(lit).toBeLessThan(150);
    });

    it('is repeatable with the same seed', () => {
      const a = gen.sparkle({ width: 10, height: 5 }, { frames: 2, seed: 7 }).map(f => (f.objects[0] as BitmapObject).rows);
      const b = gen.sparkle({ width: 10, height: 5 }, { frames: 2, seed: 7 }).map(f => (f.objects[0] as BitmapObject).rows);
      expect(a).toEqual(b);
    });
  });

  describe('wipe', () => {
    const grids = () => TestBed.inject(GridService);
    function grid(rows: string[]) {
      const g = grids().generateEmptyGrid('g', { width: rows[0].length, height: rows.length });
      rows.forEach((row, y) => [...row].forEach((c, x) => (g.pixels[y][x].active = c === '#')));
      return g;
    }
    const rowsOf = (frames: ReturnType<ShowGeneratorService['wipe']>) => frames.map(f => (f.objects[0] as BitmapObject).rows);

    it('pushes the new picture in column by column from the left', () => {
      const frames = gen.wipe(grid(['....', '....']), grid(['####', '####']), { direction: 'left', stepDuration: 30 });
      expect(rowsOf(frames)).toEqual([['1000', '1000'], ['1100', '1100'], ['1110', '1110']]);
      expect(frames.every(f => f.duration === 30)).toBe(true);
    });

    it('wipes from the right, the top and the bottom', () => {
      const from = grid(['...', '...']);
      const to = grid(['###', '###']);
      expect(rowsOf(gen.wipe(from, to, { direction: 'right' }))[0]).toEqual(['001', '001']);
      expect(rowsOf(gen.wipe(from, to, { direction: 'top' }))).toEqual([['111', '000']]);
      expect(rowsOf(gen.wipe(from, to, { direction: 'bottom' }))).toEqual([['000', '111']]);
    });
  });
});
