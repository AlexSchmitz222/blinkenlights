import { Size } from "./grid.interface";
import { Pixel } from "./pixel.interface";

export interface Shape {
    id: string;
    description: string;
    size: Size;
    pattern: Pixel[];
    inverted: boolean;
}

/** Returns a fresh, empty shape. Use instead of a shared constant so callers can't mutate each other's state. */
export function createEmptyShape(): Shape {
    return {
        id: '',
        description: '',
        size: { width: 0, height: 0 },
        pattern: [],
        inverted: false
    };
}
