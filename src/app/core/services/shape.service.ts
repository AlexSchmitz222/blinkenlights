import { Injectable } from '@angular/core';
import { Shapes } from '../../shapes/shapes.shapes';
import { Shape } from '../interfaces/shape.interface';
import { Grid } from '../interfaces/grid.interface';
import { Pixel } from '../interfaces/pixel.interface';

@Injectable({
  providedIn: 'root'
})

export class ShapeService {
  shapes: Shape[] = Shapes;
  constructor() { }

  getShape(shapeId: string): Shape | undefined {
    return this.shapes.find(shape => shape.id === shapeId);
  }

  getShapes(): Shape[] {
    return this.shapes
  }

  getShapeRequiredSize(shape: Shape): {width: number, height: number} {
    let maxX = 0;
    let maxY = 0;

    shape.pattern.forEach(pixel => {
      maxX = Math.max(maxX, pixel.position.x + 1);
      maxY = Math.max(maxY, pixel.position.y + 1);
    });

    return { width: maxX, height: maxY };
  }

  invertShapePattern(shape: Shape, inverted?: boolean): Shape {
    shape.pattern = this.transformPixelPatternAddNonActivePixels(shape.pattern, { width: shape.size.width, height: shape.size.height });
    if (inverted !== undefined) {
      shape.inverted = inverted;
    }

    shape.pattern.forEach((pixel) => {
      pixel.active = !pixel.active;
    })

    return shape;
  }

  generateShapeWithNonActivePixels(shape: Shape): Shape {

    let pattern: Pixel[] = [];
    let count: number = 0;
    for (let shapeHeight = 0; shapeHeight < shape.size.height; shapeHeight++) {
      const row: Pixel[] = [];
      for (let shapeWidth = 0; shapeWidth < shape.size.width; shapeWidth++) {
        const patternPixel = shape.pattern.find(p => p.position.x === shapeWidth && p.position.y === shapeHeight);
        pattern.push({
          id: count.toString(),
          position: {
            x: shapeWidth,
            y: shapeHeight
          },
          active: patternPixel ? patternPixel.active : false
        });
        count++
      }
    }

    return {
      id: shape.id,
      description: shape.description,
      size: {
        width: shape.size.width,
        height: shape.size.height
      },
      pattern: pattern,
      inverted: shape.inverted
    }
  }

  transformPixelPatternAddNonActivePixels(pattern: Pixel[], size: { width: number, height: number }): Pixel[] {
    let pixelPattern: Pixel[] = [];
    let count: number = 0;
    for (let shapeHeight = 0; shapeHeight < size.height; shapeHeight++) {
      const row: Pixel[] = [];
      for (let shapeWidth = 0; shapeWidth < size.width; shapeWidth++) {
        const patternPixel = pattern.find(p => p.position.x === shapeWidth && p.position.y === shapeHeight);
        pixelPattern.push({
          id: count.toString(),
          position: {
            x: shapeWidth,
            y: shapeHeight
          },
          active: patternPixel ? patternPixel.active : false
        });
        count++
      }
    }

    return pixelPattern;
  }

  transformPixelPatternRemoveNonActivePixels(pattern: Pixel[]): Pixel[] {
    pattern.forEach((pixel, index) => {
      if (!pixel.active) {
        pattern.slice(index, 1);
      }
    })

    return pattern;
  }

  transform1DPixelPatternTo2D(pattern: Pixel[], size: { width: number, height: number }): Pixel[][] {
    let pixels: Pixel[][] = [];
    let count: number = 0;
    for (let shapeHeight = 0; shapeHeight < size.height; shapeHeight++) {
      const row: Pixel[] = [];
      for (let shapeWidth = 0; shapeWidth < size.width; shapeWidth++) {
        const patternPixel = pattern.find(p => p.position.x === shapeWidth && p.position.y === shapeHeight);
        row.push({
          id: count.toString(),
          position: {
            x: shapeWidth,
            y: shapeHeight
          },
          active: patternPixel ? patternPixel.active : false
        });
        count++
      }
      pixels.push(row);
    }

    return pixels;
  }

  transform2DPixelPatternTo1D(pixels: Pixel[][], includeNonActive: boolean): { pattern: Pixel[], size: { width: number, height: number } } {
    let pattern: Pixel[] = [];
    let patternWidth = pixels[0]?.length || 0;
    let patternHeight = pixels.length;

    for (let pHeight = 0; pHeight < patternHeight; pHeight++) {
      for (let pWidth = 0; pWidth < patternWidth; pWidth++) {
        let pixel = pixels[pHeight][pWidth];
        if (includeNonActive || pixel.active) {
          pattern.push({
            position: {
              x: pWidth,
              y: pHeight
            },
            active: pixel.active
          })
        }
      }
    }
    return {
      pattern: pattern,
      size: {
        width: patternWidth,
        height: patternHeight
      }
    }
  }

  transformShapeToGrid(shape: Shape, gridId: string, gridDescription?: string): Grid {
    return {
      id: gridId,
      description: gridDescription,
      size: {
        width: shape.size.width,
        height: shape.size.height
      },
      pixels: this.transform1DPixelPatternTo2D(shape.pattern, { width: shape.size.width, height: shape.size.height }),
      inverted: shape.inverted
    }

  }

  transformGridToShape(grid: Grid, shapeId: string, shapeDescription: string): Shape {
    return {
      id: shapeId,
      description: shapeDescription,
      size: {
        width: grid.size.width,
        height: grid.size.height
      },
      pattern: this.transform2DPixelPatternTo1D(grid.pixels, false).pattern,
      inverted: grid.inverted
    }
  }
}
