import { Component, ChangeDetectionStrategy, inject, input, computed, effect, untracked, signal, ElementRef, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PixelGridComponent } from '../../shared/pixel-grid/pixel-grid.component';
import { PLAYBACK_SPEEDS, PlayerService } from '../../core/services/player.service';
import { MatMenuModule } from '@angular/material/menu';
import { RenderService } from '../../core/services/render.service';
import { StorageService } from '../../core/services/storage.service';
import { findPreset } from '../../core/interfaces/show.interface';
import { readPreference, writePreference } from '../../core/utils/preferences';
import { safeReturnUrl } from '../../core/utils/return-to';
import { TranslationKey } from '../../core/i18n/i18n.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

const VIEW_MODES = ['facade', 'pixel'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

@Component({
  selector: 'app-player',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, PixelGridComponent, TranslatePipe],
  providers: [PlayerService],
  templateUrl: './player.component.html',
  styleUrl: './player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.idle]': 'idle()',
    '(window:keydown)': 'onKeydown($event)',
    '(pointermove)': 'wake()',
    '(pointerdown)': 'wake()',
    '(document:fullscreenchange)': 'fullscreen.set(!!document.fullscreenElement)',
  },
})
export class PlayerComponent {
  readonly player = inject(PlayerService);
  private render = inject(RenderService);
  private storage = inject(StorageService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private i18n = inject(I18nService);

  /** Route parameter `/play/:showId`. */
  readonly showId = input.required<string>();
  /** Query parameter: where "back" leads, e.g. the show editor that opened the player. */
  readonly returnTo = input<string>();

  readonly backLink = computed(() => safeReturnUrl(this.returnTo()) ?? '/shows');
  readonly backLabel = computed<TranslationKey>(() => (safeReturnUrl(this.returnTo()) ? 'common.back' : 'common.backToShows'));

  readonly show = computed(() => this.storage.getShow(this.showId()) ?? null);
  readonly viewMode = signal<ViewMode>(readPreference('playerView', VIEW_MODES, 'facade'));
  readonly debug = signal(false);
  readonly fullscreen = signal(false);
  readonly idle = signal(false);
  protected readonly document = document;
  protected readonly Math = Math;
  readonly speeds = PLAYBACK_SPEEDS;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  readonly grid = computed(() => {
    const show = this.player.show();
    if (!show) return null;
    return this.render.renderFrame(this.player.current()?.frame, show.size, id => this.storage.getShape(id));
  });

  readonly presetName = computed(() => {
    const show = this.show();
    return show ? findPreset(show.size)?.name ?? `${show.size.width} × ${show.size.height}` : '';
  });

  /** Fade at most half a frame, so even fast animations reach full brightness. */
  readonly fade = computed(() => {
    const duration = (this.player.current()?.frame.duration ?? 0) / this.player.speed();
    const max = this.viewMode() === 'facade' ? 180 : 120;
    return duration === 0 ? max : Math.min(max, Math.round(duration / 2));
  });

  readonly elapsed = computed(() => this.i18n.duration(this.player.current()?.start ?? 0));
  readonly total = computed(() => this.i18n.duration(this.player.totalDuration()));

  constructor() {
    effect(() => {
      const show = this.show();
      untracked(() => {
        this.player.load(show, { autoplay: true });
        if (show) writePreference('lastShow', show.id);
      });
    });
    // Hide controls and cursor while playing and the pointer is still.
    effect(() => {
      if (this.player.playing()) untracked(() => this.wake());
      else untracked(() => this.idle.set(false));
    });
    inject(DestroyRef).onDestroy(() => this.idleTimer && clearTimeout(this.idleTimer));
  }

  setViewMode(mode: ViewMode) {
    this.viewMode.set(mode);
    writePreference('playerView', mode);
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else this.host.nativeElement.requestFullscreen?.();
  }

  /** "1×", "0,5×" (German) or "0.5×". */
  formatSpeed(speed: number): string {
    return `${this.i18n.number(speed, 2)}×`;
  }

  toggleLoop() {
    this.player.loopOverride.set(!this.player.loop());
  }

  wake() {
    this.idle.set(false);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.idle.set(this.player.playing()), 2500);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.target instanceof Element && event.target.closest('input, textarea')) return;
    const actions: Record<string, () => void> = {
      ' ': () => this.player.toggle(),
      'k': () => this.player.toggle(),
      'ArrowRight': () => this.player.next(),
      'ArrowLeft': () => this.player.previous(),
      'Home': () => this.player.stop(),
      'f': () => this.toggleFullscreen(),
      'l': () => this.toggleLoop(),
      '-': () => this.player.changeSpeed(-1),
      '+': () => this.player.changeSpeed(1),
      '=': () => this.player.changeSpeed(1),
      'v': () => this.setViewMode(this.viewMode() === 'facade' ? 'pixel' : 'facade'),
    };
    const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (action && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      action();
      this.wake();
    }
  }
}
