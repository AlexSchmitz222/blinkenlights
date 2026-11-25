import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The "B" logo. Keep in sync with scripts/generate-favicon.py, which renders the favicons from the same pattern. */
export const LOGO_PATTERN = [
  '###.',
  '#..#',
  '###.',
  '#..#',
  '###.',
];

@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (row of pattern; track $index) {
      @for (cell of row; track $index) {
        <i [class.on]="cell === '#'"></i>
      }
    }
  `,
  host: {
    'aria-hidden': 'true',
    '[style.--cell.px]': 'cell()',
  },
  styles: `
    :host {
      --gap: calc(var(--cell) * 0.25);
      display: inline-grid;
      grid-template-columns: repeat(4, var(--cell));
      gap: var(--gap);
      padding: calc(var(--cell) * 0.55);
      background: #0a0a0b;
      border-radius: calc(var(--cell) * 1.1);
      flex-shrink: 0;
    }
    i {
      width: var(--cell);
      height: var(--cell);
      border-radius: calc(var(--cell) * 0.25);
      background: #26262b;
    }
    i.on {
      background: #ffe3a3;
      box-shadow: 0 0 calc(var(--cell) * 0.8) rgba(255, 196, 92, 0.5);
    }
  `,
})
export class LogoComponent {
  /** Size of one light in px. */
  readonly cell = input(4);
  readonly pattern = LOGO_PATTERN.map(row => [...row]);
}
