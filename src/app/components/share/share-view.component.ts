import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PixelGridComponent } from '../../shared/pixel-grid/pixel-grid.component';
import { PlayerService } from '../../core/services/player.service';
import { RenderService } from '../../core/services/render.service';
import { ShareService } from '../../core/services/share.service';
import { ShowFile, ShowFileService } from '../../core/services/show-file.service';
import { StorageService } from '../../core/services/storage.service';
import { InvalidFileError } from '../../core/errors/InvalidFile.error';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Opens a shared link (`/share#b1.…`): plays the show from the link on the house front, without
 * touching the visitor's own shows until they choose to keep it.
 */
@Component({
  selector: 'app-share-view',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, PixelGridComponent, TranslatePipe],
  providers: [PlayerService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page share">
      @if (file(); as file) {
        <header class="head">
          <div class="title">
            <span class="panel-title">{{ 'shareView.shared' | t }}</span>
            <h1>{{ file.show.name }}</h1>
            @if (file.show.description) {
              <p class="muted">{{ file.show.description }}</p>
            }
          </div>
          <span class="spacer"></span>
          <button matIconButton (click)="player.toggle()" [attr.aria-label]="(player.playing() ? 'common.pause' : 'common.play') | t" [matTooltip]="(player.playing() ? 'common.pause' : 'common.play') | t">
            <mat-icon [svgIcon]="player.playing() ? 'pause' : 'play'" />
          </button>
          <button matButton="filled" (click)="keep()" [disabled]="kept()">
            <mat-icon [svgIcon]="kept() ? 'check' : 'plus'" />
            {{ (kept() ? 'shareView.kept' : 'shareView.keep') | t }}
          </button>
        </header>
        <div class="stage-wrap">
          @if (grid(); as grid) {
            <app-pixel-grid [grid]="grid" fit="contain" variant="facade" />
          }
        </div>
      } @else if (error()) {
        <div class="panel empty-state">
          <p>{{ error()! | t }}</p>
          <a matButton="outlined" routerLink="/">{{ 'shareView.toApp' | t }}</a>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .share { display: flex; flex-direction: column; gap: 16px; }
    .head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .title h1 { font-size: 22px; }
    .title p { margin: 4px 0 0; }
    .stage-wrap {
      height: min(70vh, 640px);
      color-scheme: dark; /* the house front is always at night */
    }
  `,
})
export class ShareViewComponent {
  readonly player = inject(PlayerService);
  private share = inject(ShareService);
  private files = inject(ShowFileService);
  private storage = inject(StorageService);
  private render = inject(RenderService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private i18n = inject(I18nService);

  readonly file = signal<ShowFile | null>(null);
  readonly error = signal<InvalidFileError['key'] | null>(null);
  readonly kept = signal(false);

  private shapes = computed(() => new Map((this.file()?.shapes ?? []).map(s => [s.id, s])));

  readonly grid = computed(() => {
    const show = this.player.show();
    if (!show) return null;
    // shapes come from the link, not from this browser's library
    return this.render.renderFrame(this.player.current()?.frame, show.size, id => this.shapes().get(id));
  });

  constructor() {
    const fragment = inject(ActivatedRoute).snapshot.fragment ?? '';
    this.share
      .readFragment(fragment)
      .then(file => {
        this.file.set(file);
        this.player.load({ ...file.show, loop: true }, { autoplay: true });
      })
      .catch(error => this.error.set(error instanceof InvalidFileError ? error.key : 'share.invalidLink'));
  }

  /** Adds the show (and the shapes it needs) to this browser's shows. Never overwrites anything. */
  keep() {
    const file = this.file();
    if (!file) return;
    const result = this.files.importShow(file, 'keep-both');
    this.kept.set(true);
    this.snackBar
      .open(this.i18n.t('shareView.added', { name: result.show.name }), this.i18n.t('shareView.open'), { duration: 6000 })
      .onAction()
      .subscribe(() => this.router.navigate(['/shows', result.show.id]));
  }
}
