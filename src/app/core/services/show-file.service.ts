import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Show } from '../interfaces/show.interface';
import { Shape } from '../interfaces/shape.interface';
import { StorageService } from './storage.service';
import { createId } from '../utils/id';
import { InvalidFileError } from '../errors/InvalidFile.error';
import { BlinkenFormatService, MovieFormat } from './blinken-format.service';

export { InvalidFileError };

/** A single show with every shape it uses, so it works in any browser. */
export interface ShowFile {
  format: 'blinkenlights-show';
  version: 1;
  show: Show;
  shapes: Shape[];
}

/** Everything in this browser. */
export interface BackupFile {
  format: 'blinkenlights-backup';
  version: 1;
  exportedAt: string;
  shows: Show[];
  shapes: Shape[];
}

export type BlinkenFile = ShowFile | BackupFile;

export interface ImportResult {
  show: Show;
  /** Shapes that were added (new, or a changed copy of an existing one under a new id). */
  addedShapes: Shape[];
}

/** Reads and writes `.blinken.json` files. */
@Injectable({
  providedIn: 'root'
})
export class ShowFileService {
  private storage = inject(StorageService);
  private document = inject(DOCUMENT);
  private movies = inject(BlinkenFormatService);

  // --- export ----------------------------------------------------------------------------------

  createShowFile(show: Show, resolveShape: (id: string) => Shape | undefined = id => this.storage.getShape(id)): ShowFile {
    const shapeIds = new Set<string>();
    for (const scene of show.scenes)
      for (const frame of scene.frames)
        for (const object of frame.objects)
          if (object.type === 'shape') shapeIds.add(object.shapeId);

    const shapes = [...shapeIds].map(resolveShape).filter((s): s is Shape => !!s);
    return { format: 'blinkenlights-show', version: 1, show: structuredClone(show), shapes: structuredClone(shapes) };
  }

  createBackup(): BackupFile {
    return {
      format: 'blinkenlights-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      shows: structuredClone(this.storage.shows()),
      shapes: structuredClone(this.storage.shapes()),
    };
  }

  exportShow(show: Show) {
    this.download(`${slug(show.name) || 'show'}.blinken.json`, JSON.stringify(this.createShowFile(show), null, 2));
  }

  /** Exports in the original Blinkenlights formats (pixels only: shapes and text are rendered). */
  exportMovie(show: Show, format: MovieFormat) {
    const resolve = (id: string) => this.storage.getShape(id);
    const content = format === 'blm' ? this.movies.toBlm(show, resolve) : this.movies.toBml(show, resolve);
    this.download(`${slug(show.name) || 'show'}.${format}`, content, format === 'blm' ? 'text/plain' : 'application/xml');
  }

  /** Imports a BLM/BML movie as a new show. Returns null if the content isn't a movie. */
  importMovie(content: string, fileName: string): Show | null {
    if (!this.movies.detect(content)) return null;
    const show = this.movies.parse(content, fileName);
    show.name = this.uniqueName(show.name, n => this.storage.isShowNameTaken(n));
    return this.storage.saveShow(show);
  }

  exportBackup() {
    const date = new Date().toISOString().slice(0, 10);
    this.download(`blinkenlights-backup-${date}.blinken.json`, JSON.stringify(this.createBackup(), null, 2));
  }

  download(filename: string, content: string, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = this.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // --- import ----------------------------------------------------------------------------------

  /** Parses and validates file content. Throws {@link InvalidFileError} with a readable message. */
  parse(content: string): BlinkenFile {
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      throw new InvalidFileError('files.notJson');
    }
    if (!isObject(data)) throw new InvalidFileError('files.unexpected');

    if (data['format'] === 'blinkenlights-show') {
      assertShow(data['show']);
      assertShapes(data['shapes']);
      return data as unknown as ShowFile;
    }
    if (data['format'] === 'blinkenlights-backup') {
      if (!Array.isArray(data['shows'])) throw new InvalidFileError('files.noShowsList');
      (data['shows'] as unknown[]).forEach(assertShow);
      assertShapes(data['shapes']);
      return data as unknown as BackupFile;
    }
    throw new InvalidFileError('files.notBlinkenlights');
  }

  /**
   * Imports a single show with its shapes.
   * - Shapes: identical ones are reused; if a different shape already has the same id, the imported
   *   one gets a new id and the show is rewritten to point to it. Nothing existing is overwritten.
   * - Show: `mode` decides what happens if a show with the same id exists.
   */
  importShow(file: ShowFile, mode: 'replace' | 'keep-both'): ImportResult {
    const idMap = new Map<string, string>();
    const addedShapes: Shape[] = [];

    for (const shape of file.shapes) {
      const existing = this.storage.getShape(shape.id);
      if (existing && sameShape(existing, shape)) continue;
      const copy = structuredClone(shape);
      if (existing) {
        copy.id = createId('shape');
        idMap.set(shape.id, copy.id);
      }
      copy.name = this.uniqueName(copy.name, n => this.storage.isShapeNameTaken(n));
      this.storage.saveShape(copy);
      addedShapes.push(copy);
    }

    let show = structuredClone(file.show);
    for (const scene of show.scenes)
      for (const frame of scene.frames)
        for (const object of frame.objects)
          if (object.type === 'shape' && idMap.has(object.shapeId)) object.shapeId = idMap.get(object.shapeId)!;

    if (this.storage.getShow(show.id) && mode === 'keep-both') {
      show = {
        ...show,
        id: createId('show'),
        name: this.uniqueName(show.name, n => this.storage.isShowNameTaken(n)),
        createdAt: undefined,
      };
    }
    return { show: this.storage.saveShow(show), addedShapes };
  }

  /** Replaces everything in this browser with the backup. */
  restoreBackup(file: BackupFile) {
    this.storage.replaceAll(file.shapes, file.shows);
  }

  private uniqueName(name: string, taken: (name: string) => boolean): string {
    if (!taken(name)) return name;
    let n = 2;
    while (taken(`${name} (${n})`)) n++;
    return `${name} (${n})`;
  }
}

function slug(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sameShape(a: Shape, b: Shape): boolean {
  const key = (s: Shape) =>
    JSON.stringify([s.size, s.pattern.filter(p => p.active).map(p => `${p.position.x},${p.position.y}`).sort()]);
  return key(a) === key(b);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertShow(value: unknown): asserts value is Show {
  if (!isObject(value)) throw new InvalidFileError('files.noShow');
  const size = value['size'];
  if (typeof value['id'] !== 'string' || typeof value['name'] !== 'string')
    throw new InvalidFileError('files.showMissingName');
  if (!isObject(size) || !isPositiveInt(size['width']) || !isPositiveInt(size['height']))
    throw new InvalidFileError('files.showNoSize', { name: String(value['name']) });
  if (!Array.isArray(value['scenes'])) throw new InvalidFileError('files.showNoScenes', { name: String(value['name']) });
  for (const scene of value['scenes'] as unknown[]) {
    if (!isObject(scene) || !Array.isArray(scene['frames']))
      throw new InvalidFileError('files.invalidScene', { name: String(value['name']) });
    for (const frame of scene['frames'] as unknown[]) {
      if (!isObject(frame) || typeof frame['duration'] !== 'number' || !Array.isArray(frame['objects']))
        throw new InvalidFileError('files.invalidFrame', { name: String(value['name']) });
      for (const object of frame['objects'] as unknown[]) {
        if (!isObject(object) || !['shape', 'text', 'bitmap'].includes(object['type'] as string) || !isObject(object['position']))
          throw new InvalidFileError('files.unknownObject', { name: String(value['name']) });
      }
    }
  }
}

function assertShapes(value: unknown): asserts value is Shape[] {
  if (!Array.isArray(value)) throw new InvalidFileError('files.noShapesList');
  for (const shape of value) {
    if (!isObject(shape) || typeof shape['id'] !== 'string' || !isObject(shape['size']) || !Array.isArray(shape['pattern']))
      throw new InvalidFileError('files.invalidShape');
  }
}

function isPositiveInt(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 512;
}
