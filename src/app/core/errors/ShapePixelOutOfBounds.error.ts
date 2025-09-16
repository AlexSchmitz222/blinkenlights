import { Grid } from "../interfaces/grid.interface";
import { Shape } from "../interfaces/shape.interface";

export class ShapePixelOutOfBoundsError extends Error {
    public shapeSize: { width: number, height: number };
    public pixelPosition: { x: number, y: number };
    constructor(
        shapeType: string,
        shapeSize: Shape['size'],
        position: { x: number, y: number }
    ) {
        const message = shapeType
        super(message);
        this.name = this.constructor.name;
        this.shapeSize = { width: shapeSize.width, height: shapeSize.height };
        this.pixelPosition = position;
        this.stack = (new Error()).stack;
    }
}