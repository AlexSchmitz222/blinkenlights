import { Grid } from "../interfaces/grid.interface";
import { Shape } from "../interfaces/shape.interface";

export class PixelOutOfBoundsError extends Error {
    public gridSize: { width: number, height: number };
    public position: { x: number, y: number };

    constructor(
        gridSize: Grid['size'],
        position: { x: number, y: number },
    ) {
        const message = '';
        super(message);
        this.gridSize = { width: gridSize.width, height: gridSize.height };
        this.position = position;
        this.stack = (new Error()).stack;
    }
}