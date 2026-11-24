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
import { formatDuration } from '../../core/utils/preferences';

@Component({
  selector: 'app-show-list',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, PixelGridComponent],
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
          stats: `${show.scenes.length} ${show.scenes.length === 1 ? 'scene' : 'scenes'} · ${frames.length} frames · ${formatDuration(frames.reduce((t, f) => t + f.duration, 0))}`,
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
          scenes: [{ id: createId('scene'), name: 'Scene 1', frames: [{ id: createId('frame'), duration: 500, objects: [] }] }],
        });
        this.router.navigate(['/shows', show.id]);
      });
  }

  duplicate(show: Show) {
    let name = `${show.name} copy`;
    for (let n = 2; this.storage.isShowNameTaken(name); n++) name = `${show.name} copy ${n}`;
    this.storage.saveShow({ ...structuredClone(show), id: createId('show'), name, createdAt: undefined });
    this.snackBar.open(`Created "${name}"`, undefined, { duration: 2500 });
  }

  export(show: Show) {
    this.files.exportShow(show);
  }

  exportBackup() {
    this.files.exportBackup();
  }

  delete(show: Show) {
    this.dialogs
      .showBooleanDialog(`Delete "${show.name}"?`, 'This cannot be undone.', { confirmLabel: 'Delete' })
      .subscribe(ok => {
        if (!ok) return;
        this.storage.deleteShow(show.id);
        this.snackBar.open(`Deleted "${show.name}"`, 'Undo', { duration: 5000 })
          .onAction()
          .subscribe(() => this.storage.saveShow(show));
      });
  }

  async import(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const parsed = this.files.parse(await file.text());

      if (parsed.format === 'blinkenlights-backup') {
        const ok = await firstValueFrom(this.dialogs.showBooleanDialog(
          'Restore backup?',
          `This replaces everything in this browser with ${parsed.shows.length} shows and ${parsed.shapes.length} shapes from the backup.`,
          { confirmLabel: 'Restore' },
        ));
        if (!ok) return;
        this.files.restoreBackup(parsed);
        this.snackBar.open('Backup restored', undefined, { duration: 2500 });
        return;
      }

      let mode: 'replace' | 'keep-both' = 'replace';
      const existing = this.storage.getShow(parsed.show.id);
      if (existing) {
        // true = replace, false = keep both, undefined = dialog dismissed
        const answer = await firstValueFrom(this.dialogs.showBooleanDialog(
          `"${existing.name}" already exists`,
          'Replace it with the imported version, or keep both?',
          { confirmLabel: 'Replace', cancelLabel: 'Keep both' },
        ));
        if (answer === undefined) return;
        mode = answer ? 'replace' : 'keep-both';
      }
      const result = this.files.importShow(parsed, mode);
      const extra = result.addedShapes.length ? ` with ${result.addedShapes.length} new shape(s)` : '';
      this.snackBar.open(`Imported "${result.show.name}"${extra}`, 'Play', { duration: 5000 })
        .onAction()
        .subscribe(() => this.router.navigate(['/play', result.show.id]));
    } catch (error) {
      const message = error instanceof InvalidFileError ? error.message : 'The file could not be read.';
      this.snackBar.open(`Import failed: ${message}`, undefined, { duration: 6000 });
      if (!(error instanceof InvalidFileError)) console.error(error);
    }
  }
}
