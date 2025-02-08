import { Injectable } from '@angular/core';
import { Pixel } from '../interfaces/pixel.interface';
import { GridService } from './grid.service';
import { Grid } from '../interfaces/grid.interface';

@Injectable({
  providedIn: 'root'
})
export class DrawService {

  constructor(private grid: GridService) { }

  drawPixel(grid: Grid, x: number, y: number, active: boolean) {
    if (this.grid.checkPixelIsOnGrid(grid, x, y)) {
      grid.pixels[y][x].active = active
    }
  }

  drawLine(grid: Grid, x1: number, y1: number, x2: number, y2: number, active: boolean) {
    if (this.grid.checkPixelIsOnGrid(grid, x1, y1) && this.grid.checkPixelIsOnGrid(grid, x2, y2)) {
      let dx = Math.abs(x2 - x1);
      let dy = Math.abs(y2 - y1);
      let sx = (x1 < x2) ? 1 : -1;
      let sy = (y1 < y2) ? 1 : -1;
      let err = dx - dy;

      while (true) {
        // Set the pixel at (x1, y1) to active/inactive
        grid.pixels[y1][x1].active = active;

        // Break when reaching the endpoint
        if (x1 === x2 && y1 === y2) break;

        let e2 = 2 * err;

        if (e2 > -dy) {
          err -= dy;
          x1 += sx;
        }
        if (e2 < dx) {
          err += dx;
          y1 += sy;
        }
      }
    }
  }

  drawRectangle(grid: Grid, x1: number, y1: number, width: number, height: number, active: boolean, filled: boolean) {
    if (this.grid.checkPixelIsOnGrid(grid, x1, y1) && this.grid.checkPixelIsOnGrid(grid, x1 + width, y1 + height)) {
      for (let rectHeight = 0; rectHeight < height; rectHeight++) {
        const row: Pixel[] = [];
        for (let rectWidth = 0; rectWidth < width; rectWidth++) {
          let pixelActive: boolean = false;
          if (filled) {
            pixelActive = active
          } else { //non-filled rectangle
            if (rectHeight == 0 || rectHeight == height - 1 || rectWidth == 0 || rectWidth == width - 1) {
              pixelActive = active;
            } else {
              pixelActive = !active;
            }
          }
          this.drawPixel(grid, x1 + rectWidth, y1 + rectHeight, pixelActive)
        }
      }
    }
  }
}
