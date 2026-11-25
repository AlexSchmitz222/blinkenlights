import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, TranslationKey } from './i18n.service';
import { TranslationParams } from './i18n.types';

/**
 * `{{ 'shows.title' | t }}` or `{{ 'common.created' | t: { name: show.name } }}`.
 * Impure so it re-evaluates when the language signal changes (the lookup is a cheap property access).
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: TranslationKey, params?: TranslationParams): string {
    return this.i18n.t(key, params);
  }
}
