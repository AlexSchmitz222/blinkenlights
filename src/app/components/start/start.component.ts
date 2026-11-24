import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PixelGridComponent } from '../../shared/pixel-grid/pixel-grid.component';
import { PlayerService } from '../../core/services/player.service';
import { RenderService } from '../../core/services/render.service';
import { ShowGeneratorService } from '../../core/services/show-generator.service';
import { StorageService } from '../../core/services/storage.service';
import { GRID_PRESETS, Show } from '../../core/interfaces/show.interface';
import { readPreference } from '../../core/utils/preferences';

@Component({
  selector: 'app-start',
  imports: [RouterLink, MatButtonModule, MatIconModule, PixelGridComponent],
  providers: [PlayerService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page hero">
      <div class="facade-wrap" aria-hidden="true">
        <app-pixel-grid [grid]="grid()" variant="facade" />
      </div>
      <div class="copy">
        <h1>blinkenlights</h1>
        <p class="muted">
          A digital homage to <em>Blinkenlights</em>, the installation the Chaos Computer Club put on the
          Haus des Lehrers in Berlin in 2001, where every window was one pixel. Draw shapes, arrange them into
          frames and scenes, and play your show back on a virtual house front.
        </p>
        <div class="actions">
          <a matButton="filled" routerLink="/shows"><mat-icon svgIcon="movie-open-outline" />Shows</a>
          <a matButton="outlined" routerLink="/shapes"><mat-icon svgIcon="shape-outline" />Shapes</a>
          @if (lastShow(); as show) {
            <a matButton [routerLink]="['/play', show.id]"><mat-icon svgIcon="play" />Continue “{{ show.name }}”</a>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero {
      max-width: 960px;
      padding-top: 10vh;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 48px;
      align-items: center;
    }
    .facade-wrap {
      color-scheme: dark; /* the house front is always at night */
    }
    .copy {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    h1 {
      font-size: clamp(32px, 6vw, 56px);
      font-weight: 700;
      letter-spacing: -0.04em;
    }
    p {
      margin: 0;
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    @media (max-width: 760px) {
      .hero {
        grid-template-columns: 1fr;
        gap: 24px;
        padding-top: 24px;
      }
    }
  `,
})
export class StartComponent {
  private player = inject(PlayerService);
  private render = inject(RenderService);
  private storage = inject(StorageService);
  private size = GRID_PRESETS[0].size;

  readonly lastShow = computed(() => {
    const id = readPreference<string>('lastShow', this.storage.shows().map(s => s.id), '');
    return id ? this.storage.getShow(id) ?? null : null;
  });

  readonly grid = computed(() => this.render.renderFrame(this.player.current()?.frame, this.size, () => undefined));

  constructor() {
    const intro: Show = {
      id: 'intro',
      name: 'Intro',
      description: '',
      size: this.size,
      loop: true,
      scenes: [{ id: 'intro', name: 'Intro', frames: inject(ShowGeneratorService).scrollText('blinkenlights ♥', this.size, { stepDuration: 110 }) }],
    };
    this.player.load(intro, { autoplay: true });
  }
}
