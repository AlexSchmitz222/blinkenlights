import { TestBed } from '@angular/core/testing';
import { GIF_HOLD_DURATION, GifExportService } from './gif-export.service';
import { Show } from '../interfaces/show.interface';
import { Frame } from '../interfaces/frame.interface';

const noShapes = () => undefined;

function frame(id: string, duration: number, lit: string[]): Frame {
  return { id, duration, objects: [{ id: 'b', type: 'bitmap', position: { x: 0, y: 0 }, size: { width: 3, height: 2 }, rows: lit }] };
}

function show(frames: Frame[], loop = true): Show {
  return { id: 's', name: 'S', description: '', size: { width: 3, height: 2 }, loop, scenes: [{ id: 'sc', name: 'Sc', frames }] };
}

/** Reads the parts of a GIF the tests care about. */
function inspect(bytes: Uint8Array) {
  const text = String.fromCharCode(...bytes.slice(0, 6));
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  const delays: number[] = [];
  let loops = false;
  for (let i = 0; i < bytes.length - 8; i++) {
    // graphic control extension: 21 F9 04 <flags> <delay lo> <delay hi>
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) delays.push((bytes[i + 4] | (bytes[i + 5] << 8)) * 10);
    // NETSCAPE2.0 application extension = loop
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xff && String.fromCharCode(...bytes.slice(i + 3, i + 11)) === 'NETSCAPE') loops = true;
  }
  return { text, width, height, delays, loops };
}

describe('GifExportService', () => {
  let gifs: GifExportService;

  beforeEach(() => {
    gifs = TestBed.inject(GifExportService);
  });

  it('writes a GIF with one image per frame and the frame durations', () => {
    const bytes = gifs.encode(show([frame('a', 100, ['100', '000']), frame('b', 250, ['010', '000'])]), noShapes, { style: 'pixels', cellSize: 10 });
    const gif = inspect(bytes);
    expect(gif.text).toBe('GIF89a');
    expect(gif.delays).toEqual([100, 250]);
    expect(gif.loops).toBe(true);
  });

  it('sizes the image from the grid and the cell size, and reports it before encoding', () => {
    const options = { style: 'pixels' as const, cellSize: 10 };
    const bytes = gifs.encode(show([frame('a', 100, ['000', '000'])]), noShapes, options);
    const gif = inspect(bytes);
    // 10 px padding on each side, 3 cells of 10 with 2 gaps of 1 (14 % of 10)
    expect({ width: gif.width, height: gif.height }).toEqual({ width: 52, height: 41 });
    expect(gifs.measure({ width: 3, height: 2 }, options)).toEqual({ width: 52, height: 41 });
  });

  it('merges identical consecutive frames and adds up their time', () => {
    const same = ['111', '000'];
    const bytes = gifs.encode(show([frame('a', 100, same), frame('b', 100, same), frame('c', 50, ['000', '111'])]), noShapes, { style: 'facade', cellSize: 8 });
    expect(inspect(bytes).delays).toEqual([200, 50]);
  });

  it('shows hold frames for a fixed time and plays once when the show does not loop', () => {
    const bytes = gifs.encode(show([frame('a', 0, ['100', '000']), frame('b', 5, ['001', '000'])], false), noShapes, { style: 'pixels', cellSize: 4 });
    const gif = inspect(bytes);
    expect(gif.delays).toEqual([GIF_HOLD_DURATION, 20]); // 5 ms is raised to the 20 ms minimum
    expect(gif.loops).toBe(false);
  });

  it('still produces an image for an empty show', () => {
    const bytes = gifs.encode(show([]), noShapes, { style: 'pixels', cellSize: 4 });
    expect(inspect(bytes).delays.length).toBe(1);
  });
});
