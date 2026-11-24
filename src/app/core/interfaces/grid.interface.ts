import { Pixel } from "./pixel.interface";

export interface Size {
    width: number;
    height: number;
}

export interface Position {
    x: number;
    y: number;
}

export interface Grid {
    id: string;
    description?: string;
    size: Size;
    backgroundColor?: string;
    pixels: Pixel[][];
    inverted: boolean;
}

/** Returns a fresh, empty 0×0 grid. Use instead of a shared constant so callers can't mutate each other's state. */
export function createEmptyGrid(): Grid {
    return {
        id: '',
        size: { width: 0, height: 0 },
        pixels: [],
        inverted: false
    };
}
