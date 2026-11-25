import { CanDeactivateFn } from '@angular/router';
import { EnvironmentInjector, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '../i18n/i18n.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Asks before leaving a page with unsaved changes.
 * The dialog service is imported lazily: this guard is referenced from the route config, and a static
 * import would pull MatDialog and the form components into the initial bundle.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = async component => {
  if (!component.hasUnsavedChanges()) return true;
  const injector = inject(EnvironmentInjector);
  const i18n = inject(I18nService);
  const { BasicDialogService } = await import('../services/basic-dialog.service');
  return (
    (await firstValueFrom(
      injector.get(BasicDialogService).showBooleanDialog(
        i18n.t('unsavedGuard.title'),
        i18n.t('unsavedGuard.message'),
        { confirmLabel: i18n.t('unsavedGuard.discard'), cancelLabel: i18n.t('unsavedGuard.keep') },
      ),
    )) === true
  );
};
