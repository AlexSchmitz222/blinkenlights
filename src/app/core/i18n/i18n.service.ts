import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';
import { en } from './en';
import { de } from './de';
import { Dictionary, TranslationParams, TranslationPath } from './i18n.types';
import { readPreference, writePreference } from '../utils/preferences';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];
export type TranslationKey = TranslationPath<typeof en>;

const DICTIONARIES: Record<Language, Dictionary<typeof en>> = { en, de };

/**
 * Runtime translations. The language starts as the browser's language (German or English),
 * can be switched in the toolbar and is remembered per browser.
 *
 * In templates use the `t` pipe: `{{ 'shows.title' | t }}`, `{{ 'common.created' | t: { name } }}`.
 * In code use `i18n.t('shows.title')`. Both are reactive: reading them inside a template or
 * computed() updates when the language changes.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private document = inject(DOCUMENT);

  readonly lang = signal<Language>(readPreference<Language>('language', LANGUAGES.map(l => l.code), detectLanguage()));
  readonly locale = computed(() => (this.lang() === 'de' ? 'de-DE' : 'en-GB'));
  private dictionary = computed(() => DICTIONARIES[this.lang()]);

  constructor() {
    effect(() => {
      this.document.documentElement.lang = this.lang();
    });
  }

  setLanguage(lang: Language) {
    this.lang.set(lang);
    writePreference('language', lang);
  }

  t(key: TranslationKey, params?: TranslationParams): string {
    return translate(this.dictionary(), key, params);
  }

  /** Formats a number for the current language (e.g. 1,5 in German). */
  number(value: number, maximumFractionDigits = 1): string {
    return new Intl.NumberFormat(this.locale(), { maximumFractionDigits }).format(value);
  }

  /** "450 ms", "1,5 s", "2:05 min". */
  duration(ms: number): string {
    if (ms < 1000) return `${ms} ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${this.number(seconds, seconds < 10 ? 1 : 0)} s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')} min`;
  }
}

function detectLanguage(): Language {
  const languages = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  return languages.some(l => l?.toLowerCase().startsWith('de')) ? 'de' : 'en';
}

/** Looks up a dotted key, applies `singular|plural` by `params.count`, and fills `{placeholders}`. */
export function translate(dictionary: unknown, key: string, params?: TranslationParams): string {
  let value: unknown = dictionary;
  for (const part of key.split('.')) value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value !== 'string') return key;

  let text = value;
  if (text.includes('|') && params && typeof params['count'] === 'number') {
    const [one, other] = text.split('|');
    text = params['count'] === 1 ? one : other ?? one;
  }
  return params ? text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match)) : text;
}
