import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService, TranslationKey } from './i18n.service';

/** Route `title`s are translation keys; the document title follows the language. */
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  private title = inject(Title);
  private i18n = inject(I18nService);
  private key = signal<TranslationKey | null>(null);

  constructor() {
    super();
    effect(() => {
      const key = this.key();
      if (key) this.title.setTitle(this.i18n.t(key));
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot) as TranslationKey | undefined;
    this.key.set(key ?? 'titles.home');
  }
}
