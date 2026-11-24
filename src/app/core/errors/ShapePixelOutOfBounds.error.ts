import { Position, Size } from "../interfaces/grid.interface";

export class ShapePixelOutOfBoundsError extends Error {
    public shapeType: string;
    public shapeSize: Size;
    public pixelPosition: Position;

    constructor(shapeType: string, shapeSize: Size, pixelPosition: Position) {
        super(shapeType);
        this.name = 'ShapePixelOutOfBoundsError';
        this.shapeType = shapeType;
        this.shapeSize = { width: shapeSize.width, height: shapeSize.height };
        this.pixelPosition = { x: pixelPosition.x, y: pixelPosition.y };
    }
}
