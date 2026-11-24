import { ErrorHandler } from "@angular/core";
import { ShapeOutOfBoundsError } from "./ShapeOutOfBounds.error";
import { ShapePixelOutOfBoundsError } from "./ShapePixelOutOfBounds.error";
import { PixelOutOfBoundsError } from "./PixelOutOfBounds.error";

export class CustomErrorHandler implements ErrorHandler {
    handleError(error: unknown): void {
        if (error instanceof PixelOutOfBoundsError) {
            console.error(error.name,
                `\nTried to place pixel outside of the grid` +
                `\nGrid size: → ${error.gridSize.width} × ↓ ${error.gridSize.height}` +
                `\nPosition: → ${error.position.x} ↓ ${error.position.y}`);
        } else if (error instanceof ShapeOutOfBoundsError) {
            let where = `\nPosition: → ${error.position.x} ↓ ${error.position.y}`;
            if (error.shapeSize) {
                where = `\nShape size: → ${error.shapeSize.width} × ↓ ${error.shapeSize.height}` +
                    `\nPositions: → ${error.position.x} to ${error.position.x + error.shapeSize.width - 1}` +
                    `, ↓ ${error.position.y} to ${error.position.y + error.shapeSize.height - 1}`;
            } else if (error.position2) {
                where = `\nPositions:\n1: → ${error.position.x} ↓ ${error.position.y}\n2: → ${error.position2.x} ↓ ${error.position2.y}`;
            }
            console.error(error.name,
                `\nTried to place shape outside of the grid` +
                `\nShape type: ${error.shapeType}` +
                `\nGrid size: → ${error.gridSize.width} × ↓ ${error.gridSize.height}` + where);
        } else if (error instanceof ShapePixelOutOfBoundsError) {
            console.error(error.name,
                `\nShape pattern contains a pixel outside of the shape's own bounds` +
                `\nShape type: ${error.shapeType}` +
                `\nShape size: → ${error.shapeSize.width} × ↓ ${error.shapeSize.height}` +
                `\nPixel position: → ${error.pixelPosition.x} ↓ ${error.pixelPosition.y}`);
        } else {
            console.error('An unexpected error occurred:', error);
        }
    }
}
