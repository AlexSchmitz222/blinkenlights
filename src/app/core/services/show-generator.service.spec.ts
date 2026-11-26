import { TestBed } from '@angular/core/testing';
import { ShowGeneratorService } from './show-generator.service';
import { TextObject, ShapeObject, BitmapObject, SparkleObject, Frame } from '../interfaces/frame.interface';
import { RenderService } from './render.service';
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
    const render = () => TestBed.inject(RenderService);
    const lit = (frame: Frame, size: { width: number; height: number }) =>
      render().renderFrame(frame, size, () => undefined).pixels.flat().filter(p => p.active).length;

    it('stores sparkles as a small recipe (one object, a new seed per frame)', () => {
      const frames = gen.sparkle({ width: 40, height: 25 }, { frames: 5, density: 0.1, seed: 42 });
      expect(frames.length).toBe(5);
      const objects = frames.map(f => f.objects[0] as SparkleObject);
      expect(objects.every(o => o.type === 'sparkle' && o.density === 0.1)).toBe(true);
      expect(objects.map(o => o.seed)).toEqual([42, 43, 44, 45, 46]);
      expect(new Set(objects.map(o => o.id)).size).toBe(1);
    });

    it('lights roughly the requested share of pixels', () => {
      const [frame] = gen.sparkle({ width: 40, height: 25 }, { frames: 1, density: 0.1, seed: 42 });
      const count = lit(frame, { width: 40, height: 25 });
      expect(count).toBeGreaterThan(50); // ~100 of 1000
      expect(count).toBeLessThan(150);
    });

    it('draws the same lights for the same seed, and different ones for another', () => {
      const size = { width: 20, height: 10 };
      const draw = (seed: number) =>
        render().renderFrame(gen.sparkle(size, { frames: 1, seed })[0], size, () => undefined).pixels.flat().map(p => (p.active ? 1 : 0)).join('');
      expect(draw(7)).toBe(draw(7));
      expect(draw(7)).not.toBe(draw(8));
    });

    it('keeps the background underneath', () => {
      const bg: TextObject = { id: 'bg', type: 'text', text: 'I', position: { x: 0, y: 0 } };
      const [frame] = gen.sparkle({ width: 3, height: 8 }, { frames: 1, density: 0, background: [bg] });
      expect(lit(frame, { width: 3, height: 8 })).toBe(11); // just the I: 3 + 5 + 3 pixels
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
