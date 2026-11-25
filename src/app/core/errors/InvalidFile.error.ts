import type { TranslationKey } from '../i18n/i18n.service';
import type { TranslationParams } from '../i18n/i18n.types';
import { en } from '../i18n/en';
import { translate } from '../i18n/i18n.service';

/**
 * A file could not be imported. `key`/`params` describe the problem for the user (translate with
 * `i18n.t(error.key, error.params)`); `message` holds the English text for logs.
 */
export class InvalidFileError extends Error {
  constructor(readonly key: TranslationKey, readonly params?: TranslationParams) {
    super(translate(en, key, params));
    this.name = 'InvalidFileError';
  }
}
