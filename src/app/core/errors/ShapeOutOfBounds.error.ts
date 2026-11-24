import { Position, Size } from "../interfaces/grid.interface";

export class ShapeOutOfBoundsError extends Error {
    public shapeType: string;
    public gridSize: Size;
    public position: Position;
    public shapeSize?: Size;
    public position2?: Position;

    constructor(shapeType: string, gridSize: Size, position: Position, shapeSize?: Size, position2?: Position) {
        super(shapeType);
        this.name = 'ShapeOutOfBoundsError';
        this.shapeType = shapeType;
        this.gridSize = { width: gridSize.width, height: gridSize.height };
        this.position = { x: position.x, y: position.y };
        this.shapeSize = shapeSize ? { width: shapeSize.width, height: shapeSize.height } : undefined;
        this.position2 = position2 ? { x: position2.x, y: position2.y } : undefined;
    }
}
