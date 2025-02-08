import { Injectable } from '@angular/core';
import { Pixel } from '../interfaces/pixel.interface';
import { Grid } from '../interfaces/grid.interface';
import { _countGroupLabelsBeforeOption } from '@angular/material/core';

@Injectable({
  providedIn: 'root'
})
export class GridService {

  constructor() { }

  initializeGrid(grid: Grid) {
    grid.pixels = [];
    for (let gridHeight = 0; gridHeight < grid.size.height; gridHeight++) {
      const row: Pixel[] = [];
      for (let gridWidth = 0; gridWidth < grid.size.width; gridWidth++) {
        row.push({
          id: gridWidth + '_' + gridHeight,
          position: {
            x: gridWidth,
            y: gridHeight
          },
          active: false
        });
      }
      grid.pixels.push(row);
    }
    console.log(grid)
  }

  getGridSize(grid: Grid) {
    return { width: grid.size.width, height: grid.size.height }
  }

  checkPixelIsOnGrid(grid: Grid, x: number, y: number) {
    let gridSize = this.getGridSize(grid);
    return x >= 0 && x < gridSize.width && y >= 0 && y < gridSize.height
  }
}
