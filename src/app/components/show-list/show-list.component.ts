import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Show, findPreset } from '../../core/interfaces/show.interface';
import { StorageService } from '../../core/services/storage.service';
import { RenderService } from '../../core/services/render.service';
import { BasicDialogService } from '../../core/services/basic-dialog.service';
import { InvalidFileError, ShowFileService } from '../../core/services/show-file.service';
import { PixelGridComponent } from '../../shared/pixel-grid/pixel-grid.component';
import { NewShowDialogComponent, NewShowResult } from './new-show-dialog.component';
import { createId } from '../../core/utils/id';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-show-list',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, PixelGridComponent, TranslatePipe],
  templateUrl: './show-list.component.html',
  styleUrl: './show-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowListComponent {
  private storage = inject(StorageService);
  private render = inject(RenderService);
  private dialogs = inject(BasicDialogService);
  private dialog = inject(MatDialog);
  private files = inject(ShowFileService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private i18n = inject(I18nService);

  readonly items = computed(() =>
    [...this.storage.shows()]
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      .map(show => {
        const frames = show.scenes.flatMap(s => s.frames);
        const resolve = (id: string) => this.storage.getShape(id);
        // Preview the first frame that actually lights something up.
        const preview = frames.find(f => this.render.renderFrame(f, show.size, resolve).pixels.some(r => r.some(p => p.active))) ?? frames[0];
        return {
          show,
          grid: this.render.renderFrame(preview, show.size, resolve),
          preset: findPreset(show.size)?.name ?? `${show.size.width} × ${show.size.height}`,
          // reading i18n here makes the list re-render when the language changes
          stats: [
            this.i18n.t('common.scenes', { count: show.scenes.length }),
            this.i18n.t('common.frames', { count: frames.length }),
            this.i18n.duration(frames.reduce((t, f) => t + f.duration, 0)),
          ].join(' · '),
        };
      }),
  );

  newShow() {
    this.dialog
      .open<NewShowDialogComponent, void, NewShowResult>(NewShowDialogComponent, { width: '560px', maxWidth: '94vw' })
      .afterClosed()
      .subscribe(result => {
        if (!result) return;
        const show = this.storage.saveShow({
          id: createId('show'),
          name: result.name,
          description: '',
          size: result.size,
          loop: true,
          scenes: [{ id: createId('scene'), name: this.i18n.t('shows.firstScene'), frames: [{ id: createId('frame'), duration: 500, objects: [] }] }],
        });
        this.router.navigate(['/shows', show.id]);
      });
  }

  duplicate(show: Show) {
    const base = this.i18n.t('shows.copyName', { name: show.name });
    let name = base;
    for (let n = 2; this.storage.isShowNameTaken(name); n++) name = `${base} ${n}`;
    this.storage.saveShow({ ...structuredClone(show), id: createId('show'), name, createdAt: undefined });
    this.snackBar.open(this.i18n.t('common.created', { name }), undefined, { duration: 2500 });
  }

  export(show: Show) {
    this.files.exportShow(show);
  }

  exportMovie(show: Show, format: 'blm' | 'bml') {
    this.files.exportMovie(show, format);
  }

  exportBackup() {
    this.files.exportBackup();
  }

  delete(show: Show) {
    this.dialogs
      .showBooleanDialog(this.i18n.t('common.deleteTitle', { name: show.name }), this.i18n.t('common.cannotBeUndone'), { confirmLabel: this.i18n.t('common.delete') })
      .subscribe(ok => {
        if (!ok) return;
        this.storage.deleteShow(show.id);
        this.snackBar.open(this.i18n.t('common.deleted', { name: show.name }), this.i18n.t('common.undo'), { duration: 5000 })
          .onAction()
          .subscribe(() => this.storage.saveShow(show));
      });
  }

  async import(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const content = await file.text();
      const movie = this.files.importMovie(content, file.name);
      if (movie) {
        this.snackBar.open(this.i18n.t('shows.importedMovie', { name: movie.name, count: movie.scenes[0].frames.length }), this.i18n.t('common.play'), { duration: 5000 })
          .onAction()
          .subscribe(() => this.router.navigate(['/play', movie.id]));
        return;
      }
      const parsed = this.files.parse(content);

      if (parsed.format === 'blinkenlights-backup') {
        const ok = await firstValueFrom(this.dialogs.showBooleanDialog(
          this.i18n.t('shows.restoreTitle'),
          this.i18n.t('shows.restoreMessage', { shows: parsed.shows.length, shapes: parsed.shapes.length }),
          { confirmLabel: this.i18n.t('shows.restoreConfirm') },
        ));
        if (!ok) return;
        this.files.restoreBackup(parsed);
        this.snackBar.open(this.i18n.t('shows.restored'), undefined, { duration: 2500 });
        return;
      }

      let mode: 'replace' | 'keep-both' = 'replace';
      const existing = this.storage.getShow(parsed.show.id);
      if (existing) {
        // true = replace, false = keep both, undefined = dialog dismissed
        const answer = await firstValueFrom(this.dialogs.showBooleanDialog(
          this.i18n.t('shows.existsTitle', { name: existing.name }),
          this.i18n.t('shows.existsMessage'),
          { confirmLabel: this.i18n.t('shows.replace'), cancelLabel: this.i18n.t('shows.keepBoth') },
        ));
        if (answer === undefined) return;
        mode = answer ? 'replace' : 'keep-both';
      }
      const result = this.files.importShow(parsed, mode);
      const message = result.addedShapes.length
        ? this.i18n.t('shows.importedWithShapes', { name: result.show.name, count: result.addedShapes.length })
        : this.i18n.t('shows.imported', { name: result.show.name });
      this.snackBar.open(message, this.i18n.t('common.play'), { duration: 5000 })
        .onAction()
        .subscribe(() => this.router.navigate(['/play', result.show.id]));
    } catch (error) {
      const message = error instanceof InvalidFileError ? this.i18n.t(error.key, error.params) : this.i18n.t('files.unreadable');
      this.snackBar.open(this.i18n.t('shows.importFailed', { message }), undefined, { duration: 6000 });
      if (!(error instanceof InvalidFileError)) console.error(error);
    }
  }
}
