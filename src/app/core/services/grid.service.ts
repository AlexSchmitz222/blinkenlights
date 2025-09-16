import { Injectable } from '@angular/core';
import { Pixel } from '../interfaces/pixel.interface';
import { Grid } from '../interfaces/grid.interface';
import { Shape } from '../interfaces/shape.interface';

@Injectable({
  providedIn: 'root'
})
export class GridService {

  constructor() { }

  getGridSize(grid: Grid) {
    return { width: grid.size.width, height: grid.size.height }
  }

  getPixelData(grid: Grid, x: number, y: number) {
    return grid.pixels[y][x];
  }

  checkPixelIsOnGrid(grid: Grid, x: number, y: number) {
    let gridSize = this.getGridSize(grid);
    return x >= 0 && x <= gridSize.width && y >= 0 && y <= gridSize.height
  }

  generateEmptyGrid(gridId: string, size: { width: number, height: number }, gridDescription?: string, inverted?: boolean) {
    let pixels: Pixel[][] = [];
    var count: number = 0;
    for (let gridHeight = 0; gridHeight < size.height; gridHeight++) {
      const row: Pixel[] = [];
      for (let gridWidth = 0; gridWidth < size.width; gridWidth++) {
        row.push({
          id: count.toString(),
          position: {
            x: gridWidth,
            y: gridHeight
          },
          active: false
        });
        count++
      }
      pixels.push(row);
    }

    return {
      id: gridId,
      description: gridDescription,
      size: {
        width: size.width,
        height: size.height
      },
      pixels: pixels,
      inverted: inverted ? inverted : false
    }
  }
}

