import { Size } from '../interfaces/grid.interface';
import { Pixel } from '../interfaces/pixel.interface';

/** The subset of ImageData this needs (so it also works with plain objects in tests). */
export interface RgbaImage {
  width: number;
  height: number;
  /** RGBA bytes, row by row. */
  data: ArrayLike<number>;
}

export interface ImageToPatternOptions {
  /** 0–255: pixels darker than this light up. */
  threshold: number;
  /** Light up the bright pixels instead of the dark ones. */
  invert: boolean;
}

/**
 * Turns an (already resized) image into lit pixels. Dark pixels light up by default, because images
 * are usually dark drawings on a light background; `invert` swaps that. Transparent pixels always
 * stay off, so logos with a transparent background work either way.
 */
export function imageToPattern(image: RgbaImage, options: ImageToPatternOptions): Pixel[] {
  const pattern: Pixel[] = [];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      const alpha = image.data[i + 3];
      if (alpha < 128) continue;
      const luminance = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
      const dark = luminance < options.threshold;
      if (dark !== options.invert) pattern.push({ position: { x, y }, active: true });
    }
  }
  return pattern;
}

/**
 * The size an image gets as a shape: scaled down (never up) to fit `max`, aspect ratio kept,
 * at least 1×1. With `width` given, the height follows the aspect ratio (and the width shrinks if the
 * height would not fit).
 */
export function fitImageSize(image: Size, max: Size, width?: number): Size {
  const aspect = image.height / image.width;
  let w = width ?? Math.min(image.width, max.width, Math.floor(max.height / aspect) || 1);
  w = Math.max(1, Math.min(max.width, Math.round(w)));
  let h = Math.max(1, Math.round(w * aspect));
  if (h > max.height) {
    h = max.height;
    w = Math.max(1, Math.round(h / aspect));
  }
  return { width: w, height: h };
}
