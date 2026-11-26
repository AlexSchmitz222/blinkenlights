import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SHAPE_MAX_SIZE, Shape } from '../../core/interfaces/shape.interface';
import { ShapeService } from '../../core/services/shape.service';
import { fitImageSize, imageToPattern } from '../../core/utils/image-to-pattern';
import { PixelGridComponent } from '../../shared/pixel-grid/pixel-grid.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface ImageImportDialogData {
  image: ImageBitmap | HTMLImageElement;
  fileName: string;
}

export type ImportedShape = Pick<Shape, 'name' | 'size' | 'pattern'>;

/** Turns a picture into a shape: pick the width, the brightness threshold and whether to invert. */
@Component({
  selector: 'app-image-import-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, FormsModule, PixelGridComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'imageImport.title' | t }}</h2>
    <mat-dialog-content>
      <div class="layout">
        <div class="preview">
          <app-pixel-grid [grid]="preview()" fit="contain" [fade]="0" />
        </div>
        <div class="controls">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>{{ 'common.name' | t }}</mat-label>
            <input matInput name="name" [ngModel]="name()" (ngModelChange)="name.set($event)" maxlength="40" />
          </mat-form-field>
          <label class="slider">
            <span>{{ 'imageImport.width' | t }} <b>{{ size().width }} × {{ size().height }}</b></span>
            <input type="range" min="1" [max]="maxSize.width" [value]="size().width" (input)="width.set(+$any($event.target).value)" />
          </label>
          <label class="slider">
            <span>{{ 'imageImport.threshold' | t }} <b>{{ threshold() }}</b></span>
            <input type="range" min="1" max="255" [value]="threshold()" (input)="threshold.set(+$any($event.target).value)" />
          </label>
          <mat-slide-toggle [checked]="invert()" (change)="invert.set($event.checked)">{{ 'imageImport.invert' | t }}</mat-slide-toggle>
          <p class="muted hint">{{ 'imageImport.hint' | t }}</p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>{{ 'common.cancel' | t }}</button>
      <button matButton="filled" type="button" [disabled]="!name().trim()" (click)="create()">{{ 'imageImport.create' | t }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px; align-items: start; }
    .preview { height: 260px; }
    .controls { display: flex; flex-direction: column; gap: 14px; padding-top: 8px; /* room for the floating field label */ }
    .slider { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .slider input { width: 100%; accent-color: var(--bl-accent); }
    .hint { margin: 0; font-size: 12px; }
    @media (max-width: 600px) { .layout { grid-template-columns: 1fr; } .preview { height: 180px; } }
  `,
})
export class ImageImportDialogComponent {
  private data = inject<ImageImportDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<ImageImportDialogComponent, ImportedShape>>(MatDialogRef);
  private shapeService = inject(ShapeService);

  readonly maxSize = SHAPE_MAX_SIZE;
  private readonly source = { width: this.data.image.width, height: this.data.image.height };

  readonly name = signal(this.data.fileName.replace(/\.[^.]+$/, '').slice(0, 40) || 'Image');
  readonly width = signal(fitImageSize(this.source, SHAPE_MAX_SIZE).width);
  readonly threshold = signal(128);
  readonly invert = signal(false);

  readonly size = computed(() => fitImageSize(this.source, SHAPE_MAX_SIZE, this.width()));

  /** The image scaled to the target size; only redrawn when the size changes. */
  private readonly scaled = computed(() => {
    const { width, height } = this.size();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { width, height, data: new Uint8ClampedArray(width * height * 4) };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.data.image, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  });

  private readonly shape = computed<ImportedShape>(() => ({
    name: this.name().trim(),
    size: this.size(),
    pattern: imageToPattern(this.scaled(), { threshold: this.threshold(), invert: this.invert() }),
  }));

  readonly preview = computed(() =>
    this.shapeService.transformShapeToGrid({ id: 'preview', description: '', inverted: false, ...this.shape() }),
  );

  create() {
    if (!this.name().trim()) return;
    this.dialogRef.close(this.shape());
  }
}
