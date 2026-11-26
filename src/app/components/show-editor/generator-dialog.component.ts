import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Position } from '../../core/interfaces/grid.interface';
import { I18nService, TranslationKey } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export type GeneratorKind = 'scroll' | 'move' | 'blink' | 'typewriter' | 'sparkle' | 'wipe';

export interface GeneratorDialogData {
  kind: GeneratorKind;
  /** For 'move': where the selected object currently is. */
  from?: Position;
  /** For 'scroll': default vertical position. */
  defaultY?: Record<'regular' | 'small', number>;
}

export interface ScrollConfig { kind: 'scroll'; text: string; stepDuration: number; y: number; direction: 'left' | 'right'; inverted: boolean; font: 'regular' | 'small' }
export interface MoveConfig { kind: 'move'; to: Position; steps: number; stepDuration: number }
export interface BlinkConfig { kind: 'blink'; times: number; onDuration: number; offDuration: number; mode: 'off' | 'invert' }
export interface TypewriterConfig { kind: 'typewriter'; text: string; font: 'regular' | 'small'; stepDuration: number; holdDuration: number }
export interface SparkleConfig { kind: 'sparkle'; frames: number; density: number; stepDuration: number; keepFrame: boolean }
export interface WipeConfig { kind: 'wipe'; direction: 'left' | 'right' | 'top' | 'bottom'; stepDuration: number }
export type GeneratorConfig = ScrollConfig | MoveConfig | BlinkConfig | TypewriterConfig | SparkleConfig | WipeConfig;

@Component({
  selector: 'app-generator-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ title | t }}</h2>
    <mat-dialog-content>
      <p class="muted intro">{{ intro | t }}</p>
      <form id="generator" (ngSubmit)="create()" class="form">
        @switch (data.kind) {
          @case ('scroll') {
            <mat-form-field appearance="outline" class="wide">
              <mat-label>{{ 'generator.text' | t }}</mat-label>
              <input matInput name="text" [(ngModel)]="scroll.text" required cdkFocusInitial />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'editor.font' | t }}</mat-label>
              <mat-select name="font" [ngModel]="scroll.font" (ngModelChange)="setScrollFont($event)">
                <mat-option value="regular">{{ 'editor.fontRegular' | t }}</mat-option>
                <mat-option value="small">{{ 'editor.fontSmall' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.msPerStep' | t }}</mat-label>
              <input matInput type="number" name="step" min="20" [(ngModel)]="scroll.stepDuration" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.row' | t }}</mat-label>
              <input matInput type="number" name="y" [(ngModel)]="scroll.y" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.direction' | t }}</mat-label>
              <mat-select name="direction" [(ngModel)]="scroll.direction">
                <mat-option value="left">{{ 'generator.rightToLeft' | t }}</mat-option>
                <mat-option value="right">{{ 'generator.leftToRight' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-slide-toggle name="inverted" [(ngModel)]="scroll.inverted">{{ 'generator.inverted' | t }}</mat-slide-toggle>
          }
          @case ('move') {
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.targetX' | t }}</mat-label>
              <input matInput type="number" name="x" [(ngModel)]="move.to.x" cdkFocusInitial />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.targetY' | t }}</mat-label>
              <input matInput type="number" name="y" [(ngModel)]="move.to.y" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.steps' | t }}</mat-label>
              <input matInput type="number" name="steps" min="1" max="500" [(ngModel)]="move.steps" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.msPerStep' | t }}</mat-label>
              <input matInput type="number" name="step" min="20" [(ngModel)]="move.stepDuration" />
            </mat-form-field>
          }
          @case ('blink') {
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.times' | t }}</mat-label>
              <input matInput type="number" name="times" min="1" max="100" [(ngModel)]="blink.times" cdkFocusInitial />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.between' | t }}</mat-label>
              <mat-select name="mode" [(ngModel)]="blink.mode">
                <mat-option value="off">{{ 'generator.off' | t }}</mat-option>
                <mat-option value="invert">{{ 'generator.invertedOption' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.on' | t }}</mat-label>
              <input matInput type="number" name="on" min="20" [(ngModel)]="blink.onDuration" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.offMs' | t }}</mat-label>
              <input matInput type="number" name="off" min="20" [(ngModel)]="blink.offDuration" />
            </mat-form-field>
          }
          @case ('typewriter') {
            <mat-form-field appearance="outline" class="wide">
              <mat-label>{{ 'generator.text' | t }}</mat-label>
              <input matInput name="text" [(ngModel)]="typewriter.text" required cdkFocusInitial />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'editor.font' | t }}</mat-label>
              <mat-select name="font" [(ngModel)]="typewriter.font">
                <mat-option value="regular">{{ 'editor.fontRegular' | t }}</mat-option>
                <mat-option value="small">{{ 'editor.fontSmall' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.msPerLetter' | t }}</mat-label>
              <input matInput type="number" name="step" min="20" [(ngModel)]="typewriter.stepDuration" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.holdEnd' | t }}</mat-label>
              <input matInput type="number" name="hold" min="20" [(ngModel)]="typewriter.holdDuration" />
            </mat-form-field>
          }
          @case ('sparkle') {
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.frameCount' | t }}</mat-label>
              <input matInput type="number" name="frames" min="1" max="200" [(ngModel)]="sparkle.frames" cdkFocusInitial />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.density' | t }}</mat-label>
              <input matInput type="number" name="density" min="1" max="100" [(ngModel)]="sparkle.density" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.msPerStep' | t }}</mat-label>
              <input matInput type="number" name="step" min="20" [(ngModel)]="sparkle.stepDuration" />
            </mat-form-field>
            <mat-slide-toggle name="keep" [(ngModel)]="sparkle.keepFrame">{{ 'generator.keepFrame' | t }}</mat-slide-toggle>
          }
          @case ('wipe') {
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.direction' | t }}</mat-label>
              <mat-select name="direction" [(ngModel)]="wipe.direction">
                <mat-option value="left">{{ 'generator.fromLeft' | t }}</mat-option>
                <mat-option value="right">{{ 'generator.fromRight' | t }}</mat-option>
                <mat-option value="top">{{ 'generator.fromTop' | t }}</mat-option>
                <mat-option value="bottom">{{ 'generator.fromBottom' | t }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>{{ 'generator.msPerStep' | t }}</mat-label>
              <input matInput type="number" name="step" min="20" [(ngModel)]="wipe.stepDuration" />
            </mat-form-field>
          }
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>{{ 'common.cancel' | t }}</button>
      <button matButton="filled" type="submit" form="generator">{{ 'generator.generate' | t }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .intro { margin: 0 0 16px; font-size: 13px; }
    .form { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; align-items: center; }
    .wide { grid-column: 1 / -1; }
    mat-slide-toggle { margin-bottom: 20px; }
  `,
})
export class GeneratorDialogComponent {
  readonly data = inject<GeneratorDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject<MatDialogRef<GeneratorDialogComponent, GeneratorConfig>>(MatDialogRef);

  readonly scroll: ScrollConfig = { kind: 'scroll', text: inject(I18nService).t('generator.defaultText'), stepDuration: 70, y: this.data.defaultY?.regular ?? 0, direction: 'left', inverted: false, font: 'regular' };
  readonly move: MoveConfig = { kind: 'move', to: { x: (this.data.from?.x ?? 0) + 10, y: this.data.from?.y ?? 0 }, steps: 10, stepDuration: 80 };
  readonly blink: BlinkConfig = { kind: 'blink', times: 3, onDuration: 300, offDuration: 300, mode: 'off' };
  readonly typewriter: TypewriterConfig = { kind: 'typewriter', text: inject(I18nService).t('generator.defaultText'), font: 'regular', stepDuration: 150, holdDuration: 1500 };
  /** density in percent here; converted to 0–1 when generating */
  readonly sparkle: SparkleConfig = { kind: 'sparkle', frames: 15, density: 8, stepDuration: 90, keepFrame: true };
  readonly wipe: WipeConfig = { kind: 'wipe', direction: 'left', stepDuration: 40 };

  /** Switching the font re-centres the text vertically (the fonts have different heights). */
  setScrollFont(font: 'regular' | 'small') {
    this.scroll.font = font;
    this.scroll.y = this.data.defaultY?.[font] ?? this.scroll.y;
  }

  get title(): TranslationKey {
    return (({
      scroll: 'generator.scrollTitle', move: 'generator.moveTitle', blink: 'generator.blinkTitle',
      typewriter: 'generator.typewriterTitle', sparkle: 'generator.sparkleTitle', wipe: 'generator.wipeTitle',
    }) as const)[this.data.kind];
  }

  get intro(): TranslationKey {
    return (({
      scroll: 'generator.scrollIntro', move: 'generator.moveIntro', blink: 'generator.blinkIntro',
      typewriter: 'generator.typewriterIntro', sparkle: 'generator.sparkleIntro', wipe: 'generator.wipeIntro',
    }) as const)[this.data.kind];
  }

  create() {
    const clampMs = (v: number) => Math.max(20, Math.round(Number(v) || 0));
    switch (this.data.kind) {
      case 'scroll':
        if (!this.scroll.text.trim()) return;
        this.dialogRef.close({ ...this.scroll, stepDuration: clampMs(this.scroll.stepDuration), y: Math.round(Number(this.scroll.y) || 0) });
        break;
      case 'move':
        this.dialogRef.close({
          ...this.move,
          to: { x: Math.round(Number(this.move.to.x) || 0), y: Math.round(Number(this.move.to.y) || 0) },
          steps: Math.min(500, Math.max(1, Math.round(Number(this.move.steps) || 1))),
          stepDuration: clampMs(this.move.stepDuration),
        });
        break;
      case 'blink':
        this.dialogRef.close({
          ...this.blink,
          times: Math.min(100, Math.max(1, Math.round(Number(this.blink.times) || 1))),
          onDuration: clampMs(this.blink.onDuration),
          offDuration: clampMs(this.blink.offDuration),
        });
        break;
      case 'typewriter':
        if (!this.typewriter.text.trim()) return;
        this.dialogRef.close({ ...this.typewriter, stepDuration: clampMs(this.typewriter.stepDuration), holdDuration: clampMs(this.typewriter.holdDuration) });
        break;
      case 'sparkle':
        this.dialogRef.close({
          ...this.sparkle,
          frames: Math.min(200, Math.max(1, Math.round(Number(this.sparkle.frames) || 1))),
          density: Math.min(100, Math.max(1, Number(this.sparkle.density) || 1)) / 100,
          stepDuration: clampMs(this.sparkle.stepDuration),
        });
        break;
      case 'wipe':
        this.dialogRef.close({ ...this.wipe, stepDuration: clampMs(this.wipe.stepDuration) });
        break;
    }
  }
}
