import { TestBed } from '@angular/core/testing';
import { GridService } from './grid.service';

describe('GridService', () => {
  let service: GridService;

  beforeEach(() => {
    service = TestBed.inject(GridService);
  });

  it('generates a grid with the requested size and sequential pixel ids', () => {
    const grid = service.generateEmptyGrid('g', { width: 3, height: 2 });
    expect(grid.pixels.length).toBe(2);
    expect(grid.pixels[0].length).toBe(3);
    expect(grid.pixels[1][2]).toEqual({ id: '5', position: { x: 2, y: 1 }, active: false });
  });

  it('treats the last row and column as on the grid', () => {
    const grid = service.generateEmptyGrid('g', { width: 39, height: 21 });
    expect(service.checkPixelIsOnGrid(grid, 38, 20)).toBe(true);
    expect(service.checkPixelIsOnGrid(grid, 0, 0)).toBe(true);
  });

  it('treats coordinates equal to width/height or negative as off the grid', () => {
    const grid = service.generateEmptyGrid('g', { width: 39, height: 21 });
    expect(service.checkPixelIsOnGrid(grid, 39, 0)).toBe(false);
    expect(service.checkPixelIsOnGrid(grid, 0, 21)).toBe(false);
    expect(service.checkPixelIsOnGrid(grid, -1, 0)).toBe(false);
    expect(service.checkPixelIsOnGrid(grid, 0, -1)).toBe(false);
  });
});
