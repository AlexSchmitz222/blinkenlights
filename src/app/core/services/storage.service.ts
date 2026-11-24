import { Injectable, computed, signal } from '@angular/core';
import { Shape } from '../interfaces/shape.interface';
import { DEFAULT_SHAPES } from '../../shapes/shapes.shapes';

/** Everything the app persists in the browser. Bump `version` and add a migration when the shape of this changes. */
export interface StoredData {
  version: 1;
  shapes: Shape[];
}

export const STORAGE_KEY = 'blinkenlights.data';
/** Key used by the first version of the app (a bare Shape[] where id doubled as name). */
const LEGACY_SHAPES_KEY = 'shapes';

/**
 * The single place that reads and writes persistent data (localStorage).
 * Exposes signals; every write goes through here and is saved immediately.
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly data = signal<StoredData>(this.load());

  readonly shapes = computed(() => this.data().shapes);

  getShape(id: string): Shape | undefined {
    return this.shapes().find(shape => shape.id === id);
  }

  /** Insert or update (matched by id). */
  saveShape(shape: Shape): void {
    const copy = structuredClone(shape);
    this.update(data => {
      const index = data.shapes.findIndex(s => s.id === shape.id);
      const shapes = [...data.shapes];
      if (index > -1) shapes[index] = copy;
      else shapes.push(copy);
      return { ...data, shapes };
    });
  }

  deleteShape(id: string): void {
    this.update(data => ({ ...data, shapes: data.shapes.filter(s => s.id !== id) }));
  }

  /** True if another shape (other than `exceptId`) already uses this name (case-insensitive). */
  isShapeNameTaken(name: string, exceptId?: string): boolean {
    const normalized = name.trim().toLowerCase();
    return this.shapes().some(s => s.id !== exceptId && s.name.trim().toLowerCase() === normalized);
  }

  private update(fn: (data: StoredData) => StoredData) {
    this.data.update(fn);
    this.persist(this.data());
  }

  private load(): StoredData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return this.migrate(JSON.parse(raw));

      const legacy = localStorage.getItem(LEGACY_SHAPES_KEY);
      if (legacy) {
        const data = this.fromLegacyShapes(JSON.parse(legacy));
        this.persist(data);
        return data;
      }
    } catch (error) {
      console.error('Could not read saved data, starting fresh', error);
    }

    const seeded: StoredData = { version: 1, shapes: structuredClone(DEFAULT_SHAPES) };
    this.persist(seeded);
    return seeded;
  }

  private migrate(data: StoredData): StoredData {
    // Only one version so far. Future migrations go here, e.g. `if (data.version === 1) data = v1ToV2(data)`.
    return { version: 1, shapes: data.shapes ?? [] };
  }

  /** The first version stored a bare Shape[] whose id was the display name. */
  private fromLegacyShapes(shapes: Partial<Shape>[]): StoredData {
    return {
      version: 1,
      shapes: shapes.map(s => ({
        id: s.id ?? '',
        name: s.name ?? s.id ?? 'Untitled',
        description: s.description ?? '',
        size: s.size ?? { width: 0, height: 0 },
        pattern: (s.pattern ?? []).filter(p => p.active),
        inverted: s.inverted ?? false,
      })),
    };
  }

  private persist(data: StoredData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Could not save data', error);
    }
  }
}
