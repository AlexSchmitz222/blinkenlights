import { CanDeactivateFn } from '@angular/router';
import { EnvironmentInjector, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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
  const { BasicDialogService } = await import('../services/basic-dialog.service');
  return (
    (await firstValueFrom(
      injector.get(BasicDialogService).showBooleanDialog(
        'Discard changes?',
        'You have unsaved changes. If you leave now, they will be lost.',
        { confirmLabel: 'Discard', cancelLabel: 'Keep editing' },
      ),
    )) === true
  );
};
