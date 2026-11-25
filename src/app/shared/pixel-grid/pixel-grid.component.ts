import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, viewChild } from '@angular/core';
import { Grid, Position } from '../../core/interfaces/grid.interface';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface GridHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 'selected' is drawn solid, 'hover' dashed. */
  kind?: 'selected' | 'hover';
}

export interface PixelPointerEvent extends Position {
  phase: 'start' | 'move';
  /** The mouse button / pen action: 0 = primary, 2 = secondary. */
  button: number;
}

/**
 * Renders a {@link Grid} as a "screen" of lights. Follows the theme; force dark with `color-scheme: dark` on a parent (the player does).
 *
 * Sizing:
 * - `fit="width"` (default): fills the available width, height follows the grid's aspect ratio.
 * - `fit="contain"`: fits inside the parent's width *and* height (the parent must give it a height).
 */
@Component({
  selector: 'app-pixel-grid',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pixel-grid.component.html',
  styleUrl: './pixel-grid.component.scss',
  host: {
    '[class.fit-contain]': "fit() === 'contain'",
    '[class.facade]': "variant() === 'facade'",
    '[class.interactive]': 'interactive()',
    '[class.bare]': 'bare()',
    '[style.--fade]': 'fade() === null ? null : fade() + "ms"',
  },
})
export class PixelGridComponent {
  readonly grid = input.required<Grid>();
  readonly fit = input<'width' | 'contain'>('width');
  readonly variant = input<'pixel' | 'facade'>('pixel');
  /** Show x/y on every pixel. */
  readonly debug = input(false);
  /** Enables pointer painting; emits `pixelPointer` events. */
  readonly interactive = input(false);
  /** Drop the dark frame/padding (for tiny thumbnails). */
  readonly bare = input(false);
  readonly highlights = input<GridHighlight[]>([]);
  /** A second grid shown faintly underneath (onion skin). */
  readonly ghost = input<Grid | null>(null);
  /**
   * How long a light takes to switch on/off, in ms. Default: a soft 120 ms (180 ms for the facade).
   * Editors pass 0 for instant feedback; the player passes a value that fits the frame duration.
   */
  readonly fade = input<number | null>(null);

  readonly pixelPointer = output<PixelPointerEvent>();
  readonly pixelPointerEnd = output<void>();

  private gridEl = viewChild.required<ElementRef<HTMLElement>>('gridEl');
  private lastCell: string | null = null;
  private activeButton = 0;

  readonly width = computed(() => this.grid().size.width);
  readonly height = computed(() => this.grid().size.height);

  readonly cells = computed(() => {
    const ghost = this.ghost();
    return this.grid().pixels.flat().map(p => ({
      x: p.position.x,
      y: p.position.y,
      on: p.active === true,
      ghost: !!ghost && ghost.pixels[p.position.y]?.[p.position.x]?.active === true,
    }));
  });

  /** Highlights clamped to the visible grid, as CSS grid placements. */
  readonly visibleHighlights = computed(() => {
    const w = this.width();
    const h = this.height();
    return this.highlights()
      .map(hl => {
        const x1 = Math.max(0, hl.x);
        const y1 = Math.max(0, hl.y);
        const x2 = Math.min(w, hl.x + hl.width);
        const y2 = Math.min(h, hl.y + hl.height);
        if (x2 <= x1 || y2 <= y1) return null;
        return { area: `${y1 + 1} / ${x1 + 1} / ${y2 + 1} / ${x2 + 1}`, kind: hl.kind ?? 'selected' };
      })
      .filter(hl => hl !== null);
  });

  onPointerDown(event: PointerEvent) {
    if (!this.interactive()) return;
    event.preventDefault();
    this.gridEl().nativeElement.setPointerCapture(event.pointerId);
    this.activeButton = event.button;
    this.lastCell = null;
    this.emit(event, 'start');
  }

  onPointerMove(event: PointerEvent) {
    if (!this.interactive() || this.lastCell === null) return;
    this.emit(event, 'move');
  }

  onPointerUp() {
    if (this.lastCell === null) return;
    this.lastCell = null;
    this.pixelPointerEnd.emit();
  }

  private emit(event: PointerEvent, phase: 'start' | 'move') {
    const rect = this.gridEl().nativeElement.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * this.width());
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * this.height());
    const key = `${x},${y}`;
    if (phase === 'move' && key === this.lastCell) return;
    this.lastCell = key;
    if (x < 0 || y < 0 || x >= this.width() || y >= this.height()) return;
    this.pixelPointer.emit({ x, y, phase, button: this.activeButton });
  }
}
