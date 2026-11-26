import { CanDeactivateFn } from '@angular/router';
import { EnvironmentInjector, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '../i18n/i18n.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  /**
   * Optional: called before asking. Return true if the page kept its unsaved state for later
   * (e.g. because `nextUrl` leads back here via ?returnTo), so leaving is fine without a question.
   */
  keepDraftFor?(nextUrl: string): boolean;
}

/**
 * Asks before leaving a page with unsaved changes, unless the page keeps them for a detour.
 * The dialog service is imported lazily: this guard is referenced from the route config, and a static
 * import would pull MatDialog and the form components into the initial bundle.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = async (component, _route, _state, next) => {
  if (!component.hasUnsavedChanges()) return true;
  if (next && component.keepDraftFor?.(next.url)) return true;
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
