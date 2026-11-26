import { TestBed } from '@angular/core/testing';
import { ShowGeneratorService } from './show-generator.service';
import { TextObject, ShapeObject } from '../interfaces/frame.interface';

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
});
