import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'blinkenlights.theme';

/**
 * Light/dark mode for the app. The player always stays dark.
 * 'system' follows the OS setting; the choice is remembered per browser.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);

  readonly mode = signal<ThemeMode>(this.load());

  constructor() {
    effect(() => {
      const mode = this.mode();
      this.document.documentElement.style.colorScheme = mode === 'system' ? 'light dark' : mode;
      this.save(mode);
    });
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
  }

  private load(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {
      // storage unavailable (private mode etc.) — fall back to system
    }
    return 'system';
  }

  private save(mode: ThemeMode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }
}
