import { Grid } from "../core/interfaces/grid.interface";
import { Shape } from "../core/interfaces/shape.interface";

export class ShapeOutOfBoundsError extends Error {
  public gridSize: { width: number, height: number };
  public position: { x: number, y: number };
  public shapeSize?: { width: number, height: number };
  public position2?: { x: number, y: number };

  constructor(
    shapeType: string,
    gridSize: Grid['size'],
    position: { x: number, y: number },
    shapeSize?: Shape['size'],
    position2?: { x: number, y: number }
  ) {
    const message = shapeType;
    super(message);
    this.name = this.constructor.name;
    this.gridSize = { width: gridSize.width, height: gridSize.height };
    this.shapeSize = shapeSize ? { width: shapeSize.width, height: shapeSize.height } : undefined;
    this.position = position;
    this.position2 = position2 ? position2 : undefined;
    this.stack = (new Error()).stack;
  }
}