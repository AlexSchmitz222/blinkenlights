import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Shape } from '../../core/interfaces/shape.interface';
import { ShapeService } from '../../core/services/shape.service';
import { StorageService } from '../../core/services/storage.service';
import { BasicDialogService } from '../../core/services/basic-dialog.service';
import { PixelGridComponent } from '../../shared/pixel-grid/pixel-grid.component';
import { createId } from '../../core/utils/id';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { shapeDeletionMessage } from './shape-deletion';

@Component({
  selector: 'app-shape-list',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, PixelGridComponent, TranslatePipe],
  templateUrl: './shape-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './shape-list.component.scss'
})
export class ShapeListComponent {
  private shapeService = inject(ShapeService);
  private storage = inject(StorageService);
  private dialogs = inject(BasicDialogService);
  private snackBar = inject(MatSnackBar);
  private i18n = inject(I18nService);

  readonly items = computed(() =>
    [...this.storage.shapes()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(shape => ({ shape, grid: this.shapeService.transformShapeToGrid(shape) })),
  );

  duplicate(shape: Shape) {
    const copy: Shape = { ...structuredClone(shape), id: createId('shape'), name: this.copyName(shape.name) };
    this.storage.saveShape(copy);
    this.snackBar.open(this.i18n.t('common.created', { name: copy.name }), undefined, { duration: 2500 });
  }

  delete(shape: Shape) {
    this.dialogs
      .showBooleanDialog(this.i18n.t('common.deleteTitle', { name: shape.name }), shapeDeletionMessage(this.i18n, this.storage, shape.id), { confirmLabel: this.i18n.t('common.delete') })
      .subscribe(ok => {
        if (!ok) return;
        this.storage.deleteShape(shape.id);
        this.snackBar.open(this.i18n.t('common.deleted', { name: shape.name }), this.i18n.t('common.undo'), { duration: 5000 })
          .onAction()
          .subscribe(() => this.storage.saveShape(shape));
      });
  }

  private copyName(name: string): string {
    const base = this.i18n.t('shapes.copyName', { name });
    let candidate = base;
    let n = 2;
    while (this.storage.isShapeNameTaken(candidate)) candidate = `${base} ${n++}`;
    return candidate;
  }
}
