import { Injectable, computed, inject, signal } from '@angular/core';
import { Shape } from '../interfaces/shape.interface';
import { Show } from '../interfaces/show.interface';
import { DEFAULT_SHAPES } from '../../shapes/shapes.shapes';
import { DEMO_SHAPE_IDS, buildDemoShows } from '../../shows/demo.shows';
import { ShowGeneratorService } from './show-generator.service';

/** Everything the app persists in the browser. Bump `version` and add a migration when the shape of this changes. */
export interface StoredData {
  version: 1;
  shapes: Shape[];
  shows: Show[];
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
  private generator = inject(ShowGeneratorService);
  private readonly data = signal<StoredData>(this.load());

  readonly shapes = computed(() => this.data().shapes);
  readonly shows = computed(() => this.data().shows);

  // --- shapes ----------------------------------------------------------------------------------

  getShape(id: string): Shape | undefined {
    return this.shapes().find(shape => shape.id === id);
  }

  /** Insert or update (matched by id). */
  saveShape(shape: Shape): void {
    this.update(data => ({ ...data, shapes: upsert(data.shapes, structuredClone(shape)) }));
  }

  deleteShape(id: string): void {
    this.update(data => ({ ...data, shapes: data.shapes.filter(s => s.id !== id) }));
  }

  /** True if another shape (other than `exceptId`) already uses this name (case-insensitive). */
  isShapeNameTaken(name: string, exceptId?: string): boolean {
    return isNameTaken(this.shapes(), name, exceptId);
  }

  /** Shows that place this shape somewhere. */
  showsUsingShape(shapeId: string): Show[] {
    return this.shows().filter(show =>
      show.scenes.some(scene =>
        scene.frames.some(frame => frame.objects.some(o => o.type === 'shape' && o.shapeId === shapeId)),
      ),
    );
  }

  // --- shows -----------------------------------------------------------------------------------

  getShow(id: string): Show | undefined {
    return this.shows().find(show => show.id === id);
  }

  /** Insert or update (matched by id). Sets `updatedAt`. */
  saveShow(show: Show): Show {
    const now = new Date().toISOString();
    const saved: Show = { ...structuredClone(show), createdAt: show.createdAt ?? now, updatedAt: now };
    this.update(data => ({ ...data, shows: upsert(data.shows, saved) }));
    return saved;
  }

  deleteShow(id: string): void {
    this.update(data => ({ ...data, shows: data.shows.filter(s => s.id !== id) }));
  }

  isShowNameTaken(name: string, exceptId?: string): boolean {
    return isNameTaken(this.shows(), name, exceptId);
  }

  /** Replace everything (used when restoring a backup). */
  replaceAll(shapes: Shape[], shows: Show[]): void {
    this.update(() => ({ version: 1, shapes: structuredClone(shapes), shows: structuredClone(shows) }));
  }

  // --- persistence -----------------------------------------------------------------------------

  private update(fn: (data: StoredData) => StoredData) {
    this.data.update(fn);
    this.persist(this.data());
  }

  private load(): StoredData {
    let data: StoredData | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        data = this.migrate(JSON.parse(raw));
      } else {
        const legacy = localStorage.getItem(LEGACY_SHAPES_KEY);
        if (legacy) data = this.fromLegacyShapes(JSON.parse(legacy));
      }
    } catch (error) {
      console.error('Could not read saved data, starting fresh', error);
    }

    if (!data) {
      data = { version: 1, shapes: structuredClone(DEFAULT_SHAPES), shows: this.demoShows() };
    } else if (!data.shows) {
      // Data from before shows existed: add the demos once (and the shapes they need).
      data = this.withDemoShows(data);
    }
    this.persist(data);
    return data;
  }

  private migrate(data: Partial<StoredData>): StoredData {
    // Only one version so far. Future migrations go here, e.g. `if (data.version === 1) data = v1ToV2(data)`.
    // `shows` stays undefined if missing so load() can add the demos.
    return { version: 1, shapes: data.shapes ?? [], shows: data.shows as Show[] };
  }

  private withDemoShows(data: StoredData): StoredData {
    const shapes = [...data.shapes];
    for (const id of DEMO_SHAPE_IDS) {
      if (!shapes.some(s => s.id === id)) shapes.push(structuredClone(DEFAULT_SHAPES.find(s => s.id === id)!));
    }
    return { ...data, shapes, shows: this.demoShows() };
  }

  private demoShows(): Show[] {
    return buildDemoShows(this.generator);
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
      shows: undefined as unknown as Show[],
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

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex(i => i.id === item.id);
  if (index === -1) return [...items, item];
  const copy = [...items];
  copy[index] = item;
  return copy;
}

function isNameTaken(items: { id: string; name: string }[], name: string, exceptId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return items.some(i => i.id !== exceptId && i.name.trim().toLowerCase() === normalized);
}
