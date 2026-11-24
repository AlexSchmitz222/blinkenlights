import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Position } from '../../core/interfaces/grid.interface';

export type GeneratorKind = 'scroll' | 'move' | 'blink';

export interface GeneratorDialogData {
  kind: GeneratorKind;
  /** For 'move': where the selected object currently is. */
  from?: Position;
  /** For 'scroll': default vertical position. */
  defaultY?: number;
}

export interface ScrollConfig { kind: 'scroll'; text: string; stepDuration: number; y: number; direction: 'left' | 'right'; inverted: boolean }
export interface MoveConfig { kind: 'move'; to: Position; steps: number; stepDuration: number }
export interface BlinkConfig { kind: 'blink'; times: number; onDuration: number; offDuration: number; mode: 'off' | 'invert' }
export type GeneratorConfig = ScrollConfig | MoveConfig | BlinkConfig;

@Component({
  selector: 'app-generator-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <p class="muted intro">{{ intro }}</p>
      <form id="generator" (ngSubmit)="create()" class="form">
        @switch (data.kind) {
          @case ('scroll') {
            <mat-form-field appearance="outline" class="wide">
              <mat-label>Text</mat-label>
              <input matInput name="text" [(ngModel)]="scroll.text" required cdkFocusInitial />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>ms per step</mat-label>
              <input matInput type="number" name="step" min="20" [(ngModel)]="scroll.stepDuration" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Row (y)</mat-label>
              <input matInput type="number" name="y" [(ngModel)]="scroll.y" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Direction</mat-label>
              <mat-select name="direction" [(ngModel)]="scroll.direction">
                <mat-option value="left">Right → left</mat-option>
                <mat-option value="right">Left → right</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-slide-toggle name="inverted" [(ngModel)]="scroll.inverted">Inverted</mat-slide-toggle>
          }
          @case ('move') {
            <mat-form-field appearance="outline">
              <mat-label>Target x</mat-label>
              <input matInput type="number" name="x" [(ngModel)]="move.to.x" cdkFocusInitial />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Target y</mat-label>
              <input matInput type="number" name="y" [(ngModel)]="move.to.y" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Steps</mat-label>
              <input matInput type="number" name="steps" min="1" max="500" [(ngModel)]="move.steps" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>ms per step</mat-label>
              <input matInput type="number" name="step" min="20" [(ngModel)]="move.stepDuration" />
            </mat-form-field>
          }
          @case ('blink') {
            <mat-form-field appearance="outline">
              <mat-label>Times</mat-label>
              <input matInput type="number" name="times" min="1" max="100" [(ngModel)]="blink.times" cdkFocusInitial />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Between</mat-label>
              <mat-select name="mode" [(ngModel)]="blink.mode">
                <mat-option value="off">Off</mat-option>
                <mat-option value="invert">Inverted</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>On (ms)</mat-label>
              <input matInput type="number" name="on" min="20" [(ngModel)]="blink.onDuration" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Off (ms)</mat-label>
              <input matInput type="number" name="off" min="20" [(ngModel)]="blink.offDuration" />
            </mat-form-field>
          }
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      <button matButton="filled" type="submit" form="generator">Generate</button>
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

  readonly scroll: ScrollConfig = { kind: 'scroll', text: 'Hello!', stepDuration: 70, y: this.data.defaultY ?? 0, direction: 'left', inverted: false };
  readonly move: MoveConfig = { kind: 'move', to: { x: (this.data.from?.x ?? 0) + 10, y: this.data.from?.y ?? 0 }, steps: 10, stepDuration: 80 };
  readonly blink: BlinkConfig = { kind: 'blink', times: 3, onDuration: 300, offDuration: 300, mode: 'off' };

  get title(): string {
    return { scroll: 'Scrolling text', move: 'Move object', blink: 'Blink' }[this.data.kind];
  }

  get intro(): string {
    return {
      scroll: 'Adds a new scene in which the text scrolls across the grid, one pixel per frame.',
      move: 'Adds frames after the current one in which the selected object travels to the target. Everything else in the frame stays put.',
      blink: 'Adds frames after the current one that switch the current frame on and off.',
    }[this.data.kind];
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
    }
  }
}
