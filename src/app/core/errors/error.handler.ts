import { ErrorHandler } from "@angular/core";
import { ShapeOutOfBoundsError } from "./ShapeOutOfBounds.error";
import { ShapePixelOutOfBoundsError } from "./ShapePixelOutOfBounds.error";
import { PixelOutOfBoundsError } from "./PixelOutOfBounds.error";

export class CustomErrorHandler implements ErrorHandler {
    handleError(error: any): void {
        switch (true) {
            case error instanceof PixelOutOfBoundsError:
                console.error(error.name, `Tried to place pixel out of Grid\nGrid Size: → ${error.gridSize.width} * ↓ ${error.gridSize.height}\nPosition: → ${error.position.x} ↓ ${error.position.x}`, error.stack);
                break;
            case error instanceof ShapeOutOfBoundsError:
                // Handle your custom error globally
                if (error.shapeSize !== undefined) {
                    console.error(error.name, `\nTried to place shape out of Grid bounds\nShape Type: ${error.message}\nGrid Size: → ${error.gridSize.width} * ↓ ${error.gridSize.height}\nShape Size: → ${error.shapeSize.width} * ↓ ${error.shapeSize.height}\nPositions: → ${error.position.x} to ${error.position.x + error.shapeSize.width} * ↓ ${error.position.x} to ${error.position.y + error.shapeSize.height}`);
                }
                if (error.position2 !== undefined) {
                    console.error(error.name, `\nTried to place shape out of Grid bounds\nShape Type: ${error.message}\nGrid Size: → ${error.gridSize.width} * ↓ ${error.gridSize.height}\nPositions: \n1: → ${error.position.x} ↓ ${error.position.y} \n2: → ${error.position2.x} ↓ ${error.position2.y}`);
                }

                break;
            case error instanceof ShapePixelOutOfBoundsError:
                // Default error handling for other errors
                console.error(error.name, `\nTried to place shape pixel out of Shape bounds\nShape Type: ${error.message}\nShape Size: → ${error.shapeSize.width} * ↓ ${error.shapeSize.height}\nPixel Position: → ${error.pixelPosition.x}, ↓ ${error.pixelPosition.y}`);
                break;
            default:
                console.error('An unexpected error occurred:', error);
        }
    }
}