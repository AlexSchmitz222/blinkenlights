import { Injectable } from '@angular/core';
import { Pixel, pixelState } from '../interfaces/pixel.interface';
import { GridService } from './grid.service';
import { Grid } from '../interfaces/grid.interface';
import { Shape } from '../interfaces/shape.interface';
import { ShapeOutOfBoundsError } from '../../errors/ShapeOutOfBounds.error';
import { PixelOutOfBoundsError } from '../../errors/PixelOutOfBounds.error';
import { ShapePixelOutOfBoundsError } from '../../errors/ShapePixelOutOfBounds.error';

@Injectable({
  providedIn: 'root'
})
export class DrawService {

  constructor(private grid: GridService) { }

  drawPixel(grid: Grid, x: number, y: number, active: pixelState) {
    if (!this.grid.checkPixelIsOnGrid(grid, x, y)) {
      throw new PixelOutOfBoundsError({ width: grid.size.width, height: grid.size.height }, { x: x, y: y })
    }

    grid.pixels[y][x].active = (active == 'invert' ? !this.grid.getPixelData(grid, x, y).active : active)
  }

  drawLine(grid: Grid, x1: number, y1: number, x2: number, y2: number, active: pixelState) {
    if (!this.grid.checkPixelIsOnGrid(grid, x1, y1) || !this.grid.checkPixelIsOnGrid(grid, x2, y2)) {
      throw new ShapeOutOfBoundsError('Shape_Line', { width: grid.size.width, height: grid.size.height }, { x: x1, y: y1 }, undefined, { x: x2, y: y2 })
    }

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    do {
      this.drawPixel(grid, x1, y1, active);

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
    } while (x1 !== x2 || y1 !== y2);

    this.drawPixel(grid, x2, y2, active);
  }

  drawRectangle(grid: Grid, x1: number, y1: number, width: number, height: number, active: pixelState, filled: boolean) {
    if (!this.grid.checkPixelIsOnGrid(grid, x1, y1) || !this.grid.checkPixelIsOnGrid(grid, x1 + width, y1 + height)) {
      throw new ShapeOutOfBoundsError('Shape_Rect', { width: grid.size.width, height: grid.size.height }, { x: x1, y: y1 }, { width: width, height: height })
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isEdge = y === 0 || y === height - 1 || x === 0 || x === width - 1;
        const pixelActive = filled ? active : (isEdge ? active : !active);
        this.drawPixel(grid, x1 + x, y1 + y, pixelActive);
      }
    }
  }

  drawShape(grid: Grid, x: number, y: number, shape: Shape, inverted?: boolean) {
    if (!this.grid.checkPixelIsOnGrid(grid, x, y) || !this.grid.checkPixelIsOnGrid(grid, x + shape.size.width, y + shape.size.height)) {
      throw new ShapeOutOfBoundsError(`Shape_Custom:${shape.id}`, { width: grid.size.width, height: grid.size.height }, { x: x, y: y }, { width: shape.size.width, height: shape.size.height })
    }
    if (inverted) {
      for (let shapeHeight = 0; shapeHeight < shape.size.height; shapeHeight++) {
        for (let shapeWidth = 0; shapeWidth < shape.size.width; shapeWidth++) {

          const patternPixel = shape.pattern.find(p => p.position.x === shapeWidth && p.position.y === shapeHeight);
          console.log(`Searching Pixel ${shapeWidth} >> ${x + shapeWidth} | ${shapeHeight} >> ${y + shapeHeight}; Found: ${patternPixel}; Current Pixel State: ${this.grid.getPixelData(grid, x + shapeWidth, y + shapeHeight).active}; Drawing: ${patternPixel ? !patternPixel.active : 'invert'}`);
          this.drawPixel(grid, x + shapeWidth, y + shapeHeight, patternPixel ? !patternPixel.active : 'invert');
          console.log(`New Pixel State: ${this.grid.getPixelData(grid, x + shapeWidth, y + shapeHeight).active}`)
        }
      }
    } else {
      shape.pattern.forEach((pixel: Pixel) => {
        if (pixel.position.x > shape.size.width - 1 || pixel.position.y > shape.size.height - 1) {
          throw new ShapePixelOutOfBoundsError(`Shape_Custom:${shape.id}`, { width: shape.size.width, height: shape.size.height }, { x: pixel.position.x + 1, y: pixel.position.y + 1 })
        }


        this.drawPixel(grid, x + pixel.position.x, y + pixel.position.y, pixel.active);
      })
    }

  }
}



