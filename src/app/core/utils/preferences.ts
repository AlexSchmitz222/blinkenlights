/** Small per-browser UI preferences (view mode, last show, language, …). Never throws. */
export function readPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(`blinkenlights.pref.${key}`);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePreference(key: string, value: string) {
  try {
    localStorage.setItem(`blinkenlights.pref.${key}`, value);
  } catch {
    // ignore (private mode, storage full, …)
  }
}
