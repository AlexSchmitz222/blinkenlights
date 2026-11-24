import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { BasicDialogService } from '../services/basic-dialog.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Asks before leaving a page with unsaved changes. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = component => {
  if (!component.hasUnsavedChanges()) return true;
  return inject(BasicDialogService).showBooleanDialog(
    'Discard changes?',
    'You have unsaved changes. If you leave now, they will be lost.',
    { confirmLabel: 'Discard', cancelLabel: 'Keep editing' },
  );
};
