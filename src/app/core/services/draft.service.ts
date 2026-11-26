import { Injectable } from '@angular/core';

/**
 * Keeps an editor's unsaved state while the user takes a detour that leads back to it
 * (e.g. show editor → edit a shape → back). In memory only: a page reload is covered by the
 * browser's own "leave page?" warning.
 */
@Injectable({ providedIn: 'root' })
export class DraftService {
  private readonly drafts = new Map<string, unknown>();

  keep<T>(key: string, draft: T) {
    this.drafts.set(key, structuredClone(draft));
  }

  /** Returns the draft and forgets it (it is restored once). */
  take<T>(key: string): T | undefined {
    const draft = this.drafts.get(key) as T | undefined;
    this.drafts.delete(key);
    return draft;
  }

  discard(key: string) {
    this.drafts.delete(key);
  }
}
