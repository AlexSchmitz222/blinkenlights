import { Position } from "./grid.interface";

export interface Pixel {
    id?: string;
    position: Position;
    active: pixelState;
    color?: string;
}

/** `true`/`false` set a pixel; `'invert'` flips whatever is currently there. */
export type pixelState = boolean | 'invert';
