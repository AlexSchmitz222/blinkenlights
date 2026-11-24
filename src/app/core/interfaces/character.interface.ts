import { Shape } from "./shape.interface";

/**
 * A font glyph. The pattern is top-aligned to the cap line (row 0 = top of capital letters).
 * Glyphs are `FONT_CAP_HEIGHT` rows tall; letters with descenders (g, j, p, q, y, ...) are taller.
 */
export interface Character extends Shape {
    /** The character this glyph renders, e.g. "A". */
    char: string;
    /** Rows that reach below the baseline (descender). 0 for most glyphs. */
    heightOffset: number;
}
