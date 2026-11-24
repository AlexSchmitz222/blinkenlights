import { Component, Injectable, ChangeDetectionStrategy, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface InputDialogData {
  title: string;
  label?: string;
  value?: string;
  type?: HTMLInputElement['type'];
  /** Render a textarea instead of a single-line input. */
  multiline?: boolean;
  required?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BasicDialogService {
  private dialog = inject(MatDialog);

  /**
   * Shows a simple yes/no question.
   * @example
   * this.dialogs.showBooleanDialog('Delete shape?', 'This cannot be undone.').subscribe(ok => { if (ok) ... });
   */
  showBooleanDialog(title: string, message: string, labels: Pick<ConfirmDialogData, 'confirmLabel' | 'cancelLabel'> = {}): Observable<boolean> {
    return this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      data: { title, message, ...labels },
    }).afterClosed() as Observable<boolean>;
  }

  /** Asks for a text value. Emits the entered value, or `null` when cancelled. */
  showInputDialog(data: InputDialogData): Observable<string | null> {
    return this.dialog.open<InputDialogComponent, InputDialogData, string | null>(InputDialogComponent, {
      width: '420px',
      maxWidth: '90vw',
      data,
    }).afterClosed() as Observable<string | null>;
  }
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton [mat-dialog-close]="false">{{ data.cancelLabel ?? 'Cancel' }}</button>
      <button matButton="filled" [mat-dialog-close]="true" cdkFocusInitial>{{ data.confirmLabel ?? 'OK' }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

@Component({
  selector: 'app-input-dialog',
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatButtonModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <form (ngSubmit)="save()" id="input-dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ data.label ?? 'Value' }}</mat-label>
          @if (data.multiline) {
            <textarea matInput [formControl]="control" rows="4" cdkFocusInitial></textarea>
          } @else {
            <input matInput [type]="data.type ?? 'text'" [formControl]="control" cdkFocusInitial>
          }
          @if (control.hasError('required')) {
            <mat-error>Required</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" [mat-dialog-close]="null">Cancel</button>
      <button matButton="filled" type="submit" form="input-dialog-form">OK</button>
    </mat-dialog-actions>
  `,
  styles: `.full-width { width: 100%; margin-top: 8px; }`
})
export class InputDialogComponent {
  data = inject<InputDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<InputDialogComponent, string | null>>(MatDialogRef);

  control = new FormControl(this.data.value ?? '', {
    nonNullable: true,
    validators: this.data.required === false ? [] : [Validators.required],
  });

  save() {
    if (this.control.valid) {
      this.dialogRef.close(this.control.value.trim());
    } else {
      this.control.markAsTouched();
    }
  }
}
