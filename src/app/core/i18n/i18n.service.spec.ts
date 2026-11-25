import { TestBed } from '@angular/core/testing';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { I18nService, translate } from './i18n.service';
import { TranslatePipe } from './translate.pipe';
import { en } from './en';
import { de } from './de';

/** All dotted keys of a nested dictionary. */
function keys(dict: object, prefix = ''): string[] {
  return Object.entries(dict).flatMap(([k, v]) => (typeof v === 'string' ? [prefix + k] : keys(v, `${prefix}${k}.`)));
}

/** `{placeholder}` names used in a text. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
}

@Component({
  selector: 'app-pipe-host',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span>{{ 'shows.title' | t }}</span><b>{{ 'common.frames' | t: { count: 3 } }}</b>`,
})
class PipeHostComponent {}

describe('i18n', () => {
  beforeEach(() => localStorage.clear());

  describe('translate()', () => {
    const dict = { a: { hello: 'Hello {name}!', items: '{count} item|{count} items' } };

    it('fills placeholders and leaves unknown ones alone', () => {
      expect(translate(dict, 'a.hello', { name: 'Ada' })).toBe('Hello Ada!');
      expect(translate(dict, 'a.hello')).toBe('Hello {name}!');
    });

    it('picks singular or plural by count', () => {
      expect(translate(dict, 'a.items', { count: 1 })).toBe('1 item');
      expect(translate(dict, 'a.items', { count: 0 })).toBe('0 items');
      expect(translate(dict, 'a.items', { count: 7 })).toBe('7 items');
    });

    it('returns the key for unknown keys', () => {
      expect(translate(dict, 'a.nope')).toBe('a.nope');
      expect(translate(dict, 'a')).toBe('a');
    });
  });

  describe('dictionaries', () => {
    it('German has exactly the English keys', () => {
      expect(keys(de).sort()).toEqual(keys(en).sort());
    });

    it('German uses the same placeholders as English', () => {
      const mismatches = keys(en).filter(key => {
        const enText = translate(en, key);
        const deText = translate(de, key);
        return JSON.stringify(placeholders(enText)) !== JSON.stringify(placeholders(deText))
          || enText.includes('|') !== deText.includes('|');
      });
      expect(mismatches).toEqual([]);
    });

    it('has no empty texts', () => {
      expect(keys(en).filter(k => !translate(en, k).trim())).toEqual([]);
      expect(keys(de).filter(k => !translate(de, k).trim())).toEqual([]);
    });
  });

  describe('I18nService', () => {
    it('switches language, remembers it and sets <html lang>', () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setLanguage('de');
      TestBed.tick();
      expect(i18n.t('nav.shapes')).toBe('Formen');
      expect(document.documentElement.lang).toBe('de');
      expect(localStorage.getItem('blinkenlights.pref.language')).toBe('de');

      i18n.setLanguage('en');
      expect(i18n.t('nav.shapes')).toBe('Shapes');
    });

    it('formats durations per language', () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setLanguage('en');
      expect(i18n.duration(450)).toBe('450 ms');
      expect(i18n.duration(1500)).toBe('1.5 s');
      expect(i18n.duration(125_000)).toBe('2:05 min');
      i18n.setLanguage('de');
      expect(i18n.duration(1500)).toBe('1,5 s');
    });

    it('the t pipe re-renders OnPush templates when the language changes', () => {
      const i18n = TestBed.inject(I18nService);
      i18n.setLanguage('en');
      const fixture = TestBed.createComponent(PipeHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('Shows3 frames');

      i18n.setLanguage('de');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('b').textContent).toBe('3 Frames');
    });
  });
});
