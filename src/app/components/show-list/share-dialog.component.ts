import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Show } from '../../core/interfaces/show.interface';
import { LONG_LINK, ShareService } from '../../core/services/share.service';
import { GifExportService } from '../../core/services/gif-export.service';
import { ShowFileService } from '../../core/services/show-file.service';
import { StorageService } from '../../core/services/storage.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface ShareDialogData {
  show: Show;
}

/** Share a show: copy a link that contains it, use the system share sheet, or share it as a GIF. */
@Component({
  selector: 'app-share-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ 'shareDialog.title' | t: { name: data.show.name } }}</h2>
    <mat-dialog-content>
      <p class="muted intro">{{ 'shareDialog.intro' | t }}</p>
      <div class="link-row">
        <input class="link" readonly [value]="link() ?? ('shareDialog.creating' | t)" (focus)="$any($event.target).select()" [attr.aria-label]="'shareDialog.link' | t" />
        <button matButton="filled" (click)="copy()" [disabled]="!link()">
          <mat-icon svgIcon="content-copy" />
          {{ (copied() ? 'shareDialog.copied' : 'shareDialog.copy') | t }}
        </button>
      </div>
      @if (local) {
        <p class="note">{{ 'shareDialog.localOnly' | t }}</p>
      }
      @if (tooLong()) {
        <p class="note">{{ 'shareDialog.long' | t: { length: link()!.length } }}</p>
      }
      <div class="more">
        @if (canShareLink) {
          <button matButton="outlined" (click)="shareLink()" [disabled]="!link()">
            <mat-icon svgIcon="share-variant" />
            {{ 'shareDialog.shareLink' | t }}
          </button>
        }
        @if (canShareFiles) {
          <button matButton="outlined" (click)="shareGif()" [disabled]="busy()">
            <mat-icon svgIcon="file-gif-box" />
            {{ 'shareDialog.shareGif' | t }}
          </button>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>{{ 'shareDialog.done' | t }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .intro { margin: 0 0 12px; font-size: 13px; }
    .link-row { display: flex; gap: 8px; align-items: center; }
    .link {
      flex: 1; min-width: 0; padding: 8px 10px; font: inherit; font-size: 12px; color: inherit;
      background: var(--bl-surface-2); border: 1px solid var(--bl-border); border-radius: var(--bl-radius-sm);
      text-overflow: ellipsis;
    }
    .link:focus { outline: 2px solid var(--bl-accent); outline-offset: -1px; }
    .note { margin: 10px 0 0; font-size: 12px; color: var(--bl-text-muted); }
    .more { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .more:empty { display: none; }
  `,
})
export class ShareDialogComponent {
  readonly data = inject<ShareDialogData>(MAT_DIALOG_DATA);
  private share = inject(ShareService);
  private gifs = inject(GifExportService);
  private files = inject(ShowFileService);
  private storage = inject(StorageService);
  private snackBar = inject(MatSnackBar);
  private i18n = inject(I18nService);
  private document = inject(DOCUMENT);

  readonly link = signal<string | null>(null);
  readonly tooLong = signal(false);
  readonly copied = signal(false);
  readonly busy = signal(false);

  private readonly nav = this.document.defaultView?.navigator;
  readonly canShareLink = typeof this.nav?.share === 'function';
  readonly canShareFiles =
    typeof this.nav?.canShare === 'function' &&
    this.nav.canShare({ files: [new File([new Uint8Array(1)], 'x.gif', { type: 'image/gif' })] });
  /** The app is only reachable on this computer, so the link won't work for anyone else yet. */
  readonly local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(this.document.location?.hostname ?? '');

  constructor() {
    this.share.createLink(this.data.show).then(link => {
      this.link.set(link);
      this.tooLong.set(link.length > LONG_LINK);
    });
  }

  async copy() {
    const link = this.link();
    if (!link) return;
    try {
      await this.nav!.clipboard.writeText(link);
    } catch {
      // older browsers / no permission: select the text so the user can copy it by hand
      this.document.querySelector<HTMLInputElement>('app-share-dialog input.link')?.select();
      this.document.execCommand?.('copy');
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  async shareLink() {
    const link = this.link();
    if (!link) return;
    try {
      await this.nav!.share({ title: this.data.show.name, text: this.i18n.t('shareDialog.message', { name: this.data.show.name }), url: link });
    } catch {
      // the user closed the share sheet: nothing to do
    }
  }

  async shareGif() {
    this.busy.set(true);
    try {
      const bytes = this.gifs.encode(this.data.show, id => this.storage.getShape(id), { style: 'facade', cellSize: 12 });
      const file = new File([bytes as BlobPart], `${this.files.fileName(this.data.show)}.gif`, { type: 'image/gif' });
      await this.nav!.share({ title: this.data.show.name, files: [file] });
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        this.snackBar.open(this.i18n.t('gif.failed'), undefined, { duration: 4000 });
      }
    } finally {
      this.busy.set(false);
    }
  }
}
