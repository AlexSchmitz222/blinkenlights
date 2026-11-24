import { Position, Size } from "../interfaces/grid.interface";

export class PixelOutOfBoundsError extends Error {
    public gridSize: Size;
    public position: Position;

    constructor(gridSize: Size, position: Position) {
        super(`Pixel (${position.x}, ${position.y}) is outside the ${gridSize.width}×${gridSize.height} grid`);
        this.name = 'PixelOutOfBoundsError';
        this.gridSize = { width: gridSize.width, height: gridSize.height };
        this.position = { x: position.x, y: position.y };
    }
}
