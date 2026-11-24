import { Injectable } from '@angular/core';
import { Pixel } from '../interfaces/pixel.interface';
import { Grid, Size } from '../interfaces/grid.interface';

@Injectable({
  providedIn: 'root'
})
export class GridService {

  getGridSize(grid: Grid): Size {
    return { width: grid.size.width, height: grid.size.height };
  }

  getPixelData(grid: Grid, x: number, y: number): Pixel {
    return grid.pixels[y][x];
  }

  /** True if (x, y) is a valid pixel coordinate, i.e. 0 ≤ x < width and 0 ≤ y < height. */
  checkPixelIsOnGrid(grid: Grid, x: number, y: number): boolean {
    return x >= 0 && x < grid.size.width && y >= 0 && y < grid.size.height;
  }

  generateEmptyGrid(gridId: string, size: Size, gridDescription?: string, inverted = false): Grid {
    const pixels: Pixel[][] = [];
    let count = 0;
    for (let y = 0; y < size.height; y++) {
      const row: Pixel[] = [];
      for (let x = 0; x < size.width; x++) {
        row.push({ id: (count++).toString(), position: { x, y }, active: false });
      }
      pixels.push(row);
    }

    return {
      id: gridId,
      description: gridDescription,
      size: { width: size.width, height: size.height },
      pixels,
      inverted
    };
  }
}
