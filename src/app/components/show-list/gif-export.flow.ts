import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Show } from '../../core/interfaces/show.interface';
import { GifExportService } from '../../core/services/gif-export.service';
import { ShowFileService } from '../../core/services/show-file.service';
import { StorageService } from '../../core/services/storage.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { GifExportDialogComponent, GifExportDialogData } from './gif-export-dialog.component';
import { GifOptions } from '../../core/services/gif-export.service';

/** "Export as GIF": asks for style and size, renders the GIF and downloads it. Used by the show list and editor. */
@Injectable({ providedIn: 'root' })
export class GifExportFlow {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private gifs = inject(GifExportService);
  private files = inject(ShowFileService);
  private storage = inject(StorageService);
  private i18n = inject(I18nService);

  start(show: Show) {
    this.dialog
      .open<GifExportDialogComponent, GifExportDialogData, GifOptions>(GifExportDialogComponent, {
        data: { size: show.size },
        width: '480px',
        maxWidth: '94vw',
      })
      .afterClosed()
      .subscribe(options => {
        if (!options) return;
        const progress = this.snackBar.open(this.i18n.t('gif.creating'));
        // let the snackbar paint before the (synchronous) encoding blocks the page for a moment
        setTimeout(() => {
          try {
            const bytes = this.gifs.encode(show, id => this.storage.getShape(id), options);
            this.files.download(`${this.files.fileName(show)}.gif`, bytes, 'image/gif');
            progress.dismiss();
          } catch (error) {
            console.error(error);
            this.snackBar.open(this.i18n.t('gif.failed'), undefined, { duration: 4000 });
          }
        }, 50);
      });
  }
}
