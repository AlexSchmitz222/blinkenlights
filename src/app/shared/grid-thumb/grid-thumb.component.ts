import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, inject, input, signal, viewChild } from '@angular/core';
import { Grid } from '../../core/interfaces/grid.interface';
import { ThemeService } from '../../core/theme/theme.service';

/**
 * A cheap, non-interactive preview of a grid drawn on a canvas.
 * Use for many small previews (timeline, libraries); use PixelGrid for the big interactive stage.
 */
@Component({
  selector: 'app-grid-thumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas>`,
  styles: `
    :host { display: block; line-height: 0; }
    canvas { width: 100%; height: auto; border-radius: 3px; image-rendering: pixelated; }
  `,
})
export class GridThumbComponent {
  readonly grid = input.required<Grid>();
  /** Canvas pixels per grid cell. */
  readonly scale = input(4);

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private theme = inject(ThemeService);
  /** Bumped when the OS colour scheme changes, so 'system' mode redraws. */
  private schemeTick = signal(0);

  constructor() {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => this.schemeTick.update(n => n + 1);
    media?.addEventListener?.('change', onChange);
    inject(DestroyRef).onDestroy(() => media?.removeEventListener?.('change', onChange));

    afterRenderEffect(() => {
      this.theme.mode();
      this.schemeTick();
      this.draw(this.grid(), this.scale());
    });
  }

  private draw(grid: Grid, scale: number) {
    const canvas = this.canvas().nativeElement;
    const { width, height } = grid.size;
    canvas.width = Math.max(1, width * scale);
    canvas.height = Math.max(1, height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bg = resolveColor(canvas, '--bl-stage-bg', '#0a0a0b');
    const off = resolveColor(canvas, '--bl-light-off', '#1b1b1e');
    const on = resolveColor(canvas, '--bl-light-on', '#ffe3a3');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const inset = scale >= 3 ? 0.5 : 0;
    for (const row of grid.pixels) {
      for (const pixel of row) {
        ctx.fillStyle = pixel.active === true ? on : off;
        ctx.fillRect(pixel.position.x * scale + inset, pixel.position.y * scale + inset, scale - 2 * inset, scale - 2 * inset);
      }
    }
  }
}

/**
 * Resolves a colour custom property to a concrete colour. Reading the variable directly would return
 * its raw text (e.g. `light-dark(...)`), which canvas doesn't understand; going through `color` resolves it.
 */
function resolveColor(el: HTMLElement, variable: string, fallback: string): string {
  el.style.color = `var(${variable}, ${fallback})`;
  const color = getComputedStyle(el).color;
  el.style.color = '';
  return color || fallback;
}
