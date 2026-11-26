/** Minimal types for the parts of gifenc (https://github.com/mattdesl/gifenc) this app uses. */
declare module 'gifenc/dist/gifenc.esm.js' {
  export type Palette = number[][];

  export interface WriteFrameOptions {
    palette?: Palette;
    /** Frame delay in milliseconds (stored in 1/100 s). */
    delay?: number;
    /** -1 = play once, 0 = loop forever, n > 0 = n repeats. Only used on the first frame. */
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    first?: boolean;
  }

  export interface Encoder {
    writeFrame(index: Uint8Array, width: number, height: number, options?: WriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(options?: { auto?: boolean; initialCapacity?: number }): Encoder;
}
