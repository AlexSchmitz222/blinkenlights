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

@Component({
  selector: 'app-shape-list',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, PixelGridComponent],
  templateUrl: './shape-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './shape-list.component.scss'
})
export class ShapeListComponent {
  private shapeService = inject(ShapeService);
  private storage = inject(StorageService);
  private dialogs = inject(BasicDialogService);
  private snackBar = inject(MatSnackBar);

  readonly items = computed(() =>
    [...this.storage.shapes()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(shape => ({ shape, grid: this.shapeService.transformShapeToGrid(shape) })),
  );

  duplicate(shape: Shape) {
    const copy: Shape = { ...structuredClone(shape), id: createId('shape'), name: this.copyName(shape.name) };
    this.storage.saveShape(copy);
    this.snackBar.open(`Created "${copy.name}"`, undefined, { duration: 2500 });
  }

  delete(shape: Shape) {
    this.dialogs
      .showBooleanDialog(`Delete "${shape.name}"?`, this.storage.describeShapeDeletion(shape.id), { confirmLabel: 'Delete' })
      .subscribe(ok => {
        if (!ok) return;
        this.storage.deleteShape(shape.id);
        this.snackBar.open(`Deleted "${shape.name}"`, 'Undo', { duration: 5000 })
          .onAction()
          .subscribe(() => this.storage.saveShape(shape));
      });
  }

  private copyName(name: string): string {
    let candidate = `${name} copy`;
    let n = 2;
    while (this.storage.isShapeNameTaken(candidate)) candidate = `${name} copy ${n++}`;
    return candidate;
  }
}
