import { Size } from "./grid.interface";
import { Pixel } from "./pixel.interface";

export interface Shape {
    /** Stable identifier, never changes (shows reference shapes by id). */
    id: string;
    /** Display name, freely editable. */
    name: string;
    description: string;
    size: Size;
    pattern: Pixel[];
    inverted: boolean;
}

/** Largest shape the editor and the image import allow (the size of the biggest grid preset). */
export const SHAPE_MAX_SIZE: Size = { width: 39, height: 21 };

/** Returns a fresh, empty shape. Use instead of a shared constant so callers can't mutate each other's state. */
export function createEmptyShape(): Shape {
    return {
        id: '',
        name: '',
        description: '',
        size: { width: 0, height: 0 },
        pattern: [],
        inverted: false
    };
}
