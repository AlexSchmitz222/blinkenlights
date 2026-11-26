import { Show } from '../interfaces/show.interface';
import { Shape } from '../interfaces/shape.interface';
import { Frame, FrameObject } from '../interfaces/frame.interface';
import type { ShowFile } from '../services/show-file.service';
import { createId } from './id';

/*
 * A compact form of a show file for share links (link format "b2").
 *
 * What makes plain JSON links long is mostly noise: every frame, scene and object has a random id
 * (incompressible), and every value carries its field name. Here:
 * - ids of scenes, frames and objects are left out and created anew when the link is opened;
 *   an object that moves through several frames gets a small number instead, so it stays one object
 * - values are stored by position in arrays, defaults (false, 0, regular font) are left out
 * - pixels (shapes, bitmaps, changes) are written either as "0"/"1" characters (version 2) or packed
 *   6 per character in the base64url alphabet (version 3). Neither is always smaller after deflate:
 *   packing wins for scattered pixels, plain wins for pixel movies. The link uses whichever is shorter.
 * - an object that was already there in the frame before is stored as a change only:
 *   [-(n+1)] unchanged, [-(n+1), x, y] moved, [-(n+1), x, y, bits] a bitmap whose pixels changed,
 *   where bits marks the pixels that flipped (XOR with the previous picture: mostly zeros, which
 *   compress extremely well)
 * - sparkles are a recipe (density, seed), not pixels
 * Show and shape ids are kept: they let the receiver recognise shapes they already have.
 */

type CompactShape = [id: string, name: string, width: number, height: number, rows: string, description?: string];
/** [objectNumber, kind, …] — kind 0 = shape, 1 = text, 2 = bitmap; see toCompactObject. */
type CompactObject = (string | number)[];
type CompactFrame = [duration: number, ...objects: CompactObject[]];
type CompactScene = [name: string, frames: CompactFrame[]];
export type CompactShow = [
  version: 2 | 3, id: string, name: string, description: string, width: number, height: number, loop: number,
  shapes: CompactShape[], scenes: CompactScene[],
];

/** How pixel strings are written; set for the duration of one (synchronous) toCompact/fromCompact call. */
let pixelCodec = { write: plainWrite, read: plainRead };

export function toCompact(file: ShowFile, packed = false): CompactShow {
  pixelCodec = packed ? { write: pack, read: unpack } : { write: plainWrite, read: plainRead };
  const { show } = file;
  const shapeIndex = new Map(file.shapes.map((s, i) => [s.id, i]));
  const objectNumbers = new Map<string, number>();
  const numberOf = (id: string) => {
    if (!objectNumbers.has(id)) objectNumbers.set(id, objectNumbers.size);
    return objectNumbers.get(id)!;
  };

  // the last version of each object, in play order (the reader walks the frames in the same order)
  const previous = new Map<number, FrameObject>();
  const encode = (o: FrameObject): CompactObject => {
    const n = numberOf(o.id);
    const before = previous.get(n);
    previous.set(n, o);
    if (before && sameApartFromPositionAndPixels(before, o)) {
      const delta: CompactObject = [-(n + 1)];
      const moved = before.position.x !== o.position.x || before.position.y !== o.position.y;
      const pixels = o.type === 'bitmap' && before.type === 'bitmap' ? pixelCodec.write(flipped(before.rows.join(''), o.rows.join(''))) : '';
      if (moved || pixels) delta.push(o.position.x, o.position.y);
      if (pixels) delta.push(pixels);
      return delta;
    }
    return toCompactObject(o, n, shapeIndex);
  };

  return [
    packed ? 3 : 2, show.id, show.name, show.description ?? '', show.size.width, show.size.height, show.loop ? 1 : 0,
    file.shapes.map(shapeToCompact),
    show.scenes.map(scene => [scene.name, scene.frames.map(frame => [frame.duration, ...frame.objects.map(encode)] as CompactFrame)]),
  ];
}

export function fromCompact(data: unknown): ShowFile {
  if (!Array.isArray(data) || (data[0] !== 2 && data[0] !== 3) || data.length < 9) throw new Error('not a compact show');
  pixelCodec = data[0] === 3 ? { write: pack, read: unpack } : { write: plainWrite, read: plainRead };
  const [, id, name, description, width, height, loop, compactShapes, compactScenes] = data as CompactShow;
  const shapes = (compactShapes ?? []).map(shapeFromCompact);
  const objectIds = new Map<number, string>();
  const idOf = (n: number) => {
    if (!objectIds.has(n)) objectIds.set(n, createId('obj'));
    return objectIds.get(n)!;
  };

  const previous = new Map<number, FrameObject>();
  const decode = (c: CompactObject): FrameObject => {
    const first = Number(c[0]);
    let object: FrameObject;
    if (first < 0) {
      const n = -first - 1;
      const before = previous.get(n);
      if (!before) throw new Error(`change of unknown object ${n}`);
      object = { ...structuredClone(before), id: idOf(n) };
      if (c.length >= 3) object.position = { x: Number(c[1]), y: Number(c[2]) };
      if (c.length >= 4 && object.type === 'bitmap') {
        const bits = flip(object.rows.join(''), pixelCodec.read(String(c[3]), object.size.width * object.size.height));
        const width = object.size.width;
        object.rows = object.rows.map((_, r) => bits.slice(r * width, (r + 1) * width));
      }
      previous.set(n, object);
    } else {
      object = fromCompactObject(c, idOf, shapes);
      previous.set(first, object);
    }
    return object;
  };

  const show: Show = {
    id: String(id),
    name: String(name),
    description: String(description ?? ''),
    size: { width: Number(width), height: Number(height) },
    loop: loop === 1,
    scenes: (compactScenes ?? []).map(([sceneName, frames]) => ({
      id: createId('scene'),
      name: String(sceneName),
      frames: (frames ?? []).map(([duration, ...objects]): Frame => ({
        id: createId('frame'),
        duration: Number(duration),
        objects: objects.map(decode),
      })),
    })),
  };
  return { format: 'blinkenlights-show', version: 1, show, shapes };
}

// --- objects ---------------------------------------------------------------------------------------

const INVERTED = 1;
const TRANSPARENT = 2;

function toCompactObject(o: FrameObject, n: number, shapeIndex: Map<string, number>): CompactObject {
  const flags = (o.inverted ? INVERTED : 0) | (o.type === 'bitmap' && o.transparent ? TRANSPARENT : 0);
  const { x, y } = o.position;
  switch (o.type) {
    case 'shape':
      return trim([n, 0, shapeIndex.get(o.shapeId) ?? -1, x, y, flags]);
    case 'text':
      return trim([n, 1, o.text, x, y, flags, o.spacing ?? 1, o.font === 'small' ? 1 : 0], [1, 0]);
    case 'bitmap':
      return trim([n, 2, x, y, o.size.width, o.size.height, pixelCodec.write(o.rows.join('')), flags]);
    case 'sparkle':
      // density in per mille keeps it a small whole number
      return [n, 3, Math.round(o.density * 1000), o.seed];
  }
}

function fromCompactObject(c: CompactObject, idOf: (n: number) => string, shapes: Shape[]): FrameObject {
  const [n, kind] = c;
  const id = idOf(Number(n));
  if (kind === 0) {
    const [, , shape = 0, x = 0, y = 0, flags = 0] = c as number[];
    return { id, type: 'shape', shapeId: shapes[shape]?.id ?? '', position: { x, y }, ...(flags & INVERTED ? { inverted: true } : {}) };
  }
  if (kind === 1) {
    const [, , text, x = 0, y = 0, flags = 0, spacing = 1, font = 0] = c as [number, number, string, number?, number?, number?, number?, number?];
    return {
      id, type: 'text', text: String(text), position: { x, y },
      ...(flags & INVERTED ? { inverted: true } : {}),
      ...(spacing !== 1 ? { spacing } : {}),
      ...(font === 1 ? { font: 'small' as const } : {}),
    };
  }
  if (kind === 2) {
    const [, , x = 0, y = 0, width, height, bits, flags = 0] = c as [number, number, number, number, number, number, string, number?];
    const all = pixelCodec.read(String(bits), width * height);
    const rows = Array.from({ length: height }, (_, r) => all.slice(r * width, (r + 1) * width));
    return {
      id, type: 'bitmap', position: { x, y }, size: { width, height }, rows,
      ...(flags & INVERTED ? { inverted: true } : {}),
      ...(flags & TRANSPARENT ? { transparent: true } : {}),
    };
  }
  if (kind === 3) {
    const [, , permille, seed] = c as number[];
    return { id, type: 'sparkle', position: { x: 0, y: 0 }, density: Number(permille) / 1000, seed: Number(seed) };
  }
  throw new Error(`unknown object kind ${kind}`);
}

// --- changes between frames ------------------------------------------------------------------------

/** Equal except for the position and, for bitmaps, the pixels (same size and flags). */
function sameApartFromPositionAndPixels(a: FrameObject, b: FrameObject): boolean {
  const strip = (o: FrameObject) => ({ ...o, id: '', position: null, rows: null });
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/** '1' where the two pixel strings differ; trailing zeros dropped. */
function flipped(before: string, after: string): string {
  let out = '';
  for (let i = 0; i < after.length; i++) out += before[i] === after[i] ? '0' : '1';
  return out.replace(/0+$/, '');
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** "0"/"1" pixels → 6 per character (first pixel = highest bit); trailing dark pixels are dropped. */
export function pack(bits: string): string {
  let out = '';
  for (let i = 0; i < bits.length; i += 6) {
    let value = 0;
    for (let b = 0; b < 6; b++) value = (value << 1) | (bits[i + b] === '1' ? 1 : 0);
    out += ALPHABET[value];
  }
  return out.replace(/A+$/, '');
}

/** "0"/"1" pixels as they are, trailing dark pixels dropped. */
function plainWrite(bits: string): string {
  return bits.replace(/0+$/, '');
}

function plainRead(bits: string, length: number): string {
  if (!/^[01]*$/.test(bits)) throw new Error('bad pixel data');
  return bits.slice(0, length).padEnd(length, '0');
}

/** The reverse of pack(): exactly `length` "0"/"1" pixels. */
export function unpack(packed: string, length: number): string {
  let out = '';
  for (const char of packed) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new Error('bad pixel data');
    out += value.toString(2).padStart(6, '0');
  }
  return out.slice(0, length).padEnd(length, '0');
}

/** Applies a flipped() mask. */
function flip(bits: string, mask: string): string {
  let out = '';
  for (let i = 0; i < bits.length; i++) out += mask[i] === '1' ? (bits[i] === '1' ? '0' : '1') : bits[i];
  return out;
}

// --- shapes ----------------------------------------------------------------------------------------

function shapeToCompact(s: Shape): CompactShape {
  const lit = new Set(s.pattern.filter(p => p.active === true).map(p => `${p.position.x},${p.position.y}`));
  let rows = '';
  for (let y = 0; y < s.size.height; y++) for (let x = 0; x < s.size.width; x++) rows += lit.has(`${x},${y}`) ? '1' : '0';
  const compact: CompactShape = [s.id, s.name, s.size.width, s.size.height, pixelCodec.write(rows)];
  if (s.description) compact.push(s.description);
  return compact;
}

function shapeFromCompact([id, name, width, height, rows, description]: CompactShape): Shape {
  const pattern: Shape['pattern'] = [];
  const bits = pixelCodec.read(String(rows), width * height);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') pattern.push({ position: { x: i % width, y: Math.floor(i / width) }, active: true });
  }
  return { id: String(id), name: String(name), description: String(description ?? ''), size: { width, height }, pattern, inverted: false };
}

/** Drops trailing values that equal their defaults (0 unless given otherwise), position by position. */
function trim(values: CompactObject, defaults: (string | number)[] = []): CompactObject {
  const out = [...values];
  while (out.length > 2) {
    const i = out.length - 1;
    const fallback = defaults[i - (values.length - defaults.length)] ?? 0;
    if (out[i] !== fallback) break;
    out.pop();
  }
  return out;
}
