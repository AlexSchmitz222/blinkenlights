import { Position, Size } from "./grid.interface";

interface FrameObjectBase {
    id: string;
    /** Top-left corner on the grid. May be negative or beyond the grid (the object is clipped). */
    position: Position;
    /** Draw the object's bounding box lit, with the object cut out. */
    inverted?: boolean;
}

/** Places a shape from the shape library. Shapes are referenced by id, not copied. */
export interface ShapeObject extends FrameObjectBase {
    type: 'shape';
    shapeId: string;
}

/** Text in the pixel font. */
export interface TextObject extends FrameObjectBase {
    type: 'text';
    text: string;
    /** Columns between letters (default 1). */
    spacing?: number;
    /** Pixel font; default 'regular' (5×7), 'small' is 3×5 capitals. */
    font?: 'regular' | 'small';
}

/**
 * A raw bitmap, used for imported movies (BLM/BML) where every frame is just pixels.
 * `rows` are strings of '0'/'1', one per row; '1' is lit. Unlike shapes, a bitmap is opaque: '0' switches pixels off.
 */
export interface BitmapObject extends FrameObjectBase {
    type: 'bitmap';
    size: Size;
    rows: string[];
}

export type FrameObject = ShapeObject | TextObject | BitmapObject;
export type FrameObjectType = FrameObject['type'];

/** One still picture: objects drawn in order (later ones on top), shown for `duration` ms. */
export interface Frame {
    id: string;
    /** How long the frame is shown in milliseconds. 0 means: stay on this frame until the user continues. */
    duration: number;
    objects: FrameObject[];
}
