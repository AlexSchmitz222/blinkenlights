import { Injectable, computed, signal } from '@angular/core';
import { Frame, FrameObject } from '../interfaces/frame.interface';
import { createId } from '../utils/id';

export type ClipboardContent =
  | { kind: 'objects'; objects: FrameObject[] }
  | { kind: 'frames'; frames: Frame[] };

/**
 * The editor's clipboard for frames and objects. It lives as long as the app is open, so you can
 * copy in one show and paste into another. Everything is stored as a copy and gets fresh ids when
 * pasted, so pasting twice never creates duplicates.
 */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly content = signal<ClipboardContent | null>(null);

  readonly kind = computed(() => this.content()?.kind ?? null);
  readonly count = computed(() => {
    const c = this.content();
    return !c ? 0 : c.kind === 'objects' ? c.objects.length : c.frames.length;
  });

  copyObjects(objects: FrameObject[]) {
    if (objects.length) this.content.set({ kind: 'objects', objects: structuredClone(objects) });
  }

  copyFrames(frames: Frame[]) {
    if (frames.length) this.content.set({ kind: 'frames', frames: structuredClone(frames) });
  }

  /** Copies of the stored objects with new ids. */
  pasteObjects(): FrameObject[] {
    const c = this.content();
    return c?.kind === 'objects' ? c.objects.map(o => ({ ...structuredClone(o), id: createId('obj') })) : [];
  }

  /**
   * Copies of the stored frames with new frame ids. Object ids are renewed consistently across the
   * pasted frames, so an object that moves through them stays one object.
   */
  pasteFrames(): Frame[] {
    const c = this.content();
    if (c?.kind !== 'frames') return [];
    const ids = new Map<string, string>();
    const renew = (id: string) => {
      if (!ids.has(id)) ids.set(id, createId('obj'));
      return ids.get(id)!;
    };
    return c.frames.map(frame => ({
      ...structuredClone(frame),
      id: createId('frame'),
      objects: frame.objects.map(o => ({ ...structuredClone(o), id: renew(o.id) })),
    }));
  }
}
