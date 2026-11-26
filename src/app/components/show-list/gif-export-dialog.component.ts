import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Size } from '../../core/interfaces/grid.interface';
import { GifExportService, GifOptions, GifStyle } from '../../core/services/gif-export.service';
import { TranslationKey } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface GifExportDialogData {
  size: Size;
}

const SIZES: { id: string; label: TranslationKey; cellSize: number }[] = [
  { id: 's', label: 'gif.small', cellSize: 6 },
  { id: 'm', label: 'gif.medium', cellSize: 12 },
  { id: 'l', label: 'gif.large', cellSize: 20 },
];

/** Asks how the GIF should look. Returns the options, or nothing when cancelled. */
@Component({
  selector: 'app-gif-export-dialog',
  imports: [MatDialogModule, MatButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'gif.title' | t }}</h2>
    <mat-dialog-content>
      <p class="panel-title">{{ 'gif.style' | t }}</p>
      <div class="choices" role="radiogroup" [attr.aria-label]="'gif.style' | t">
        @for (s of styles; track s.id) {
          <button type="button" class="choice" role="radio" [attr.aria-checked]="style() === s.id" [class.selected]="style() === s.id" (click)="style.set(s.id)">
            <span class="swatch" [class.facade]="s.id === 'facade'"><i></i><i class="on"></i><i class="on"></i><i></i></span>
            <span>{{ s.label | t }}</span>
          </button>
        }
      </div>
      <p class="panel-title">{{ 'gif.size' | t }}</p>
      <div class="choices" role="radiogroup" [attr.aria-label]="'gif.size' | t">
        @for (s of sizes; track s.id) {
          <button type="button" class="choice" role="radio" [attr.aria-checked]="sizeId() === s.id" [class.selected]="sizeId() === s.id" (click)="sizeId.set(s.id)">
            <span>{{ s.label | t }}</span>
            <span class="muted dims">{{ dimensions()[s.id].width }} × {{ dimensions()[s.id].height }} px</span>
          </button>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>{{ 'common.cancel' | t }}</button>
      <button matButton="filled" type="button" (click)="export()">{{ 'gif.export' | t }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .choices { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
    .choice {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 10px;
      font: inherit; color: inherit; text-align: left; cursor: pointer;
      background: var(--bl-surface); border: 1px solid var(--bl-border); border-radius: var(--bl-radius);
    }
    .choice:hover { border-color: var(--bl-border-strong); }
    .choice.selected { border-color: var(--bl-accent); background: var(--bl-accent-soft); }
    .dims { font-size: 11px; }
    .swatch { display: grid; grid-template-columns: repeat(4, 10px); gap: 3px; padding: 6px; background: #0a0a0b; border-radius: 4px; }
    .swatch i { width: 10px; height: 10px; border-radius: 3px; background: #1b1b1e; }
    .swatch i.on { background: #ffe3a3; }
    .swatch.facade { background: #2a2622; gap: 5px; }
    .swatch.facade i { height: 12px; border-radius: 1px; background: #0d0d10; outline: 1px solid #191614; }
    .swatch.facade i.on { background: #ffd27a; }
    @media (max-width: 520px) { .choices { grid-template-columns: 1fr; } }
  `,
})
export class GifExportDialogComponent {
  private data = inject<GifExportDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<GifExportDialogComponent, GifOptions>>(MatDialogRef);
  private gifs = inject(GifExportService);

  readonly styles: { id: GifStyle; label: TranslationKey }[] = [
    { id: 'facade', label: 'gif.facade' },
    { id: 'pixels', label: 'gif.pixels' },
  ];
  readonly sizes = SIZES;
  readonly style = signal<GifStyle>('facade');
  readonly sizeId = signal('m');

  readonly dimensions = computed(() =>
    Object.fromEntries(SIZES.map(s => [s.id, this.gifs.measure(this.data.size, { style: this.style(), cellSize: s.cellSize })])) as Record<string, Size>,
  );

  export() {
    const cellSize = SIZES.find(s => s.id === this.sizeId())!.cellSize;
    this.dialogRef.close({ style: this.style(), cellSize });
  }
}
