import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { GRID_PRESETS, GridPreset } from '../../core/interfaces/show.interface';
import { Size } from '../../core/interfaces/grid.interface';

export interface NewShowResult {
  name: string;
  size: Size;
}

@Component({
  selector: 'app-new-show-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>New show</h2>
    <mat-dialog-content>
      <form id="new-show" (ngSubmit)="create()">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Name</mat-label>
          <input matInput name="name" [ngModel]="name()" (ngModelChange)="name.set($event)" required cdkFocusInitial maxlength="60" />
        </mat-form-field>
      </form>
      <p class="panel-title">Grid</p>
      <div class="presets" role="radiogroup" aria-label="Grid size">
        @for (preset of presets; track preset.id) {
          <button
            type="button"
            class="preset"
            role="radio"
            [attr.aria-checked]="selected().id === preset.id"
            [class.selected]="selected().id === preset.id"
            (click)="selected.set(preset)">
            <span class="mini" [style.aspect-ratio]="preset.size.width + ' / ' + preset.size.height"></span>
            <span class="name">{{ preset.name }}</span>
            <span class="size">{{ preset.size.width }} × {{ preset.size.height }}</span>
            <span class="desc">{{ preset.description }}</span>
          </button>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      <button matButton="filled" type="submit" form="new-show" [disabled]="!name().trim()">Create</button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; margin-top: 8px; }
    .presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .preset {
      display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
      padding: 10px; text-align: left; font: inherit; color: inherit; cursor: pointer;
      background: var(--bl-surface); border: 1px solid var(--bl-border); border-radius: var(--bl-radius);
    }
    .preset:hover { border-color: var(--bl-border-strong); }
    .preset.selected { border-color: var(--bl-accent); background: var(--bl-accent-soft); }
    .mini {
      width: 100%; max-height: 48px; margin-bottom: 6px; border-radius: 3px;
      background-color: var(--bl-stage-bg);
      background-image: radial-gradient(circle, var(--bl-light-off) 40%, transparent 41%);
      background-size: 6px 6px;
    }
    .name { font-weight: 500; }
    .size { font-size: 12px; }
    .desc { font-size: 11px; color: var(--bl-text-muted); line-height: 1.3; }
    @media (max-width: 520px) { .presets { grid-template-columns: 1fr; } }
  `,
})
export class NewShowDialogComponent {
  private dialogRef = inject<MatDialogRef<NewShowDialogComponent, NewShowResult>>(MatDialogRef);
  readonly presets = GRID_PRESETS;
  readonly name = signal('My show');
  readonly selected = signal<GridPreset>(GRID_PRESETS[0]);

  create() {
    const name = this.name().trim();
    if (!name) return;
    this.dialogRef.close({ name, size: { ...this.selected().size } });
  }
}
