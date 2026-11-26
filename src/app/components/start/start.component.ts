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
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { BuildInfo, REPOSITORY_URL, buildInfo } from '../../core/build-info';

@Component({
  selector: 'app-start',
  imports: [RouterLink, MatButtonModule, MatIconModule, PixelGridComponent, TranslatePipe],
  providers: [PlayerService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page hero">
      <div class="facade-wrap" aria-hidden="true">
        <app-pixel-grid [grid]="grid()" variant="facade" />
      </div>
      <div class="copy">
        <h1>blinkenlights</h1>
        <p class="muted">{{ 'start.intro' | t }}</p>
        <div class="actions">
          <a matButton="filled" routerLink="/shows"><mat-icon svgIcon="movie-open-outline" />{{ 'nav.shows' | t }}</a>
          <a matButton="outlined" routerLink="/shapes"><mat-icon svgIcon="shape-outline" />{{ 'nav.shapes' | t }}</a>
          @if (lastShow(); as show) {
            <a matButton [routerLink]="['/play', show.id]" [queryParams]="{ returnTo: '/' }"><mat-icon svgIcon="play" />{{ 'start.continue' | t: { name: show.name } }}</a>
          }
        </div>
      </div>
    </section>
    <footer class="build muted">
      @if (build; as build) {
        <span>
          {{ 'build.version' | t }}
          <a [href]="commitUrl" target="_blank" rel="noopener" [title]="build.subject">{{ build.commit.slice(0, 7) }}</a>
          @if (build.dirty) {
            <span class="dirty">{{ 'build.localChanges' | t }}</span>
          }
        </span>
        <span>·</span>
        <span>{{ 'build.builtAt' | t: { date: builtAt() } }}</span>
      } @else {
        <span>{{ 'build.dev' | t }}</span>
      }
    </footer>
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
    .build {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      padding: 32px 16px 24px;
      font-size: 11px;
    }
    .build a {
      color: inherit;
      text-decoration: underline dotted;
    }
    .dirty {
      color: var(--bl-accent);
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
  private i18n = inject(I18nService);

  /** Which build is running (commit, time), so you can tell whether a deployment is up to date. */
  readonly build: BuildInfo | null = buildInfo;
  readonly commitUrl = buildInfo ? `${REPOSITORY_URL}/commit/${buildInfo.commit}` : '';
  readonly builtAt = computed(() =>
    this.build
      ? new Intl.DateTimeFormat(this.i18n.locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(this.build.builtAt))
      : '',
  );

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
