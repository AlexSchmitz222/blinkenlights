import { TestBed } from '@angular/core/testing';
import { ShapeService } from './shape.service';
import { Shape } from '../interfaces/shape.interface';

describe('ShapeService', () => {
  let service: ShapeService;

  const shape: Shape = {
    id: 'dot',
    description: 'a dot',
    size: { width: 4, height: 3 },
    pattern: [
      { position: { x: 1, y: 1 }, active: true },
      { position: { x: 3, y: 0 }, active: false },
    ],
    inverted: false,
  };

  beforeEach(() => {
    service = TestBed.inject(ShapeService);
  });

  it('computes the required size from active pixels only', () => {
    expect(service.getShapeRequiredSize(shape)).toEqual({ width: 2, height: 2 });
  });

  it('round-trips shape → grid → shape and stores only active pixels', () => {
    const grid = service.transformShapeToGrid(shape);
    expect(grid.size).toEqual({ width: 4, height: 3 });
    expect(grid.pixels[1][1].active).toBe(true);

    const back = service.transformGridToShape(grid, 'dot', 'a dot');
    expect(back.size).toEqual(shape.size);
    expect(back.pattern).toEqual([{ position: { x: 1, y: 1 }, active: true }]);
  });

  it('builds a dense pattern covering every cell', () => {
    const dense = service.toDensePattern(shape.pattern, shape.size);
    expect(dense.length).toBe(12);
    expect(dense.filter(p => p.active).length).toBe(1);
  });

  it('inverts without mutating the input', () => {
    const inverted = service.invertShape(shape);
    expect(inverted.inverted).toBe(true);
    expect(inverted.pattern.filter(p => p.active).length).toBe(11);
    expect(shape.pattern.length).toBe(2);
    expect(shape.inverted).toBe(false);
  });
});
