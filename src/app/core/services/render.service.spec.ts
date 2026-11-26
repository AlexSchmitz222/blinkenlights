import { TestBed } from '@angular/core/testing';
import { RenderService } from './render.service';
import { Frame } from '../interfaces/frame.interface';
import { Shape } from '../interfaces/shape.interface';
import { Grid } from '../interfaces/grid.interface';

function ascii(grid: Grid): string[] {
  return grid.pixels.map(row => row.map(p => (p.active ? '#' : '.')).join(''));
}

describe('RenderService', () => {
  let render: RenderService;
  const bar: Shape = {
    id: 'bar',
    name: 'Bar',
    description: '',
    size: { width: 3, height: 1 },
    pattern: [0, 1, 2].map(x => ({ position: { x, y: 0 }, active: true })),
    inverted: false,
  };
  const resolve = (id: string) => (id === 'bar' ? bar : undefined);

  beforeEach(() => {
    render = TestBed.inject(RenderService);
  });

  it('renders an empty grid for a missing frame', () => {
    const grid = render.renderFrame(null, { width: 3, height: 2 }, resolve);
    expect(ascii(grid)).toEqual(['...', '...']);
  });

  it('draws objects in order, clipping what is off-grid, and skips unknown shapes', () => {
    const frame: Frame = {
      id: 'f',
      duration: 100,
      objects: [
        { id: 'a', type: 'shape', shapeId: 'bar', position: { x: 3, y: 0 } },
        { id: 'b', type: 'shape', shapeId: 'missing', position: { x: 0, y: 0 } },
        { id: 'c', type: 'bitmap', size: { width: 2, height: 2 }, rows: ['10', '01'], position: { x: 0, y: 1 } },
      ],
    };
    expect(ascii(render.renderFrame(frame, { width: 4, height: 3 }, resolve))).toEqual(['...#', '#...', '.#..']);
  });

  it('draws bitmaps opaque, so they can switch pixels off', () => {
    const frame: Frame = {
      id: 'f',
      duration: 100,
      objects: [
        { id: 'a', type: 'shape', shapeId: 'bar', position: { x: 0, y: 0 } },
        { id: 'b', type: 'bitmap', size: { width: 2, height: 1 }, rows: ['01'], position: { x: 0, y: 0 } },
      ],
    };
    expect(ascii(render.renderFrame(frame, { width: 3, height: 1 }, resolve))).toEqual(['.##']);
  });

  it('renders text objects', () => {
    const frame: Frame = { id: 'f', duration: 1, objects: [{ id: 't', type: 'text', text: 'I', position: { x: 0, y: 0 } }] };
    expect(ascii(render.renderFrame(frame, { width: 3, height: 8 }, resolve))[0]).toBe('###');
  });

  it('reports bounds per object type', () => {
    expect(render.getBounds({ id: 'a', type: 'shape', shapeId: 'bar', position: { x: 2, y: 1 } }, resolve))
      .toEqual({ x: 2, y: 1, width: 3, height: 1 });
    expect(render.getBounds({ id: 't', type: 'text', text: 'II', position: { x: 0, y: 0 }, inverted: true }, resolve))
      .toEqual({ x: -1, y: -1, width: 9, height: 10 });
  });

  it('keeps what is underneath transparent bitmaps', () => {
    const frame: Frame = {
      id: 'f',
      duration: 100,
      objects: [
        { id: 'a', type: 'shape', shapeId: 'bar', position: { x: 0, y: 0 } },
        { id: 'b', type: 'bitmap', size: { width: 3, height: 1 }, rows: ['001'], position: { x: 0, y: 0 }, transparent: true },
      ],
    };
    expect(ascii(render.renderFrame(frame, { width: 4, height: 1 }, resolve))).toEqual(['###.']);
  });
});
