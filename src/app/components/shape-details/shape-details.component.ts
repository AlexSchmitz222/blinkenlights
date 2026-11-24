import { Component, ChangeDetectionStrategy, inject, input, signal, computed, effect, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Shape } from '../../core/interfaces/shape.interface';
import { ShapeService } from '../../core/services/shape.service';
import { StorageService } from '../../core/services/storage.service';
import { BasicDialogService } from '../../core/services/basic-dialog.service';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { PixelGridComponent, PixelPointerEvent } from '../../shared/pixel-grid/pixel-grid.component';
import { createId } from '../../core/utils/id';

export const SHAPE_MAX_SIZE = { width: 39, height: 21 };
const NEW_SHAPE_SIZE = { width: 8, height: 8 };

@Component({
  selector: 'app-shape-details',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatTooltipModule, PixelGridComponent],
  templateUrl: './shape-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './shape-details.component.scss',
  host: {
    '(window:keydown)': 'onKeydown($event)',
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class ShapeDetailsComponent implements HasUnsavedChanges {
  private shapeService = inject(ShapeService);
  private storage = inject(StorageService);
  private dialogs = inject(BasicDialogService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  /** Route parameter (`/shapes/:shapeId`); 'new' creates a shape. */
  readonly shapeId = input.required<string>();

  readonly maxSize = SHAPE_MAX_SIZE;
  readonly dimensions = ['width', 'height'] as const;
  readonly shape = signal<Shape | null>(null);
  readonly isNew = computed(() => this.shapeId() === 'new');
  readonly debug = signal(false);

  /** JSON of the last saved state; used to detect unsaved changes. */
  private savedSnapshot = signal('');
  readonly dirty = computed(() => {
    const shape = this.shape();
    return !!shape && JSON.stringify(shape) !== this.savedSnapshot();
  });

  readonly grid = computed(() => {
    const shape = this.shape();
    return shape ? this.shapeService.transformShapeToGrid(shape) : null;
  });

  /** The shape can't shrink below the area its active pixels cover. */
  readonly minSize = computed(() => {
    const shape = this.shape();
    const required = shape ? this.shapeService.getShapeRequiredSize(shape) : { width: 1, height: 1 };
    return { width: Math.max(1, required.width), height: Math.max(1, required.height) };
  });

  readonly activeCount = computed(() => this.shape()?.pattern.filter(p => p.active).length ?? 0);

  readonly nameError = computed(() => {
    const shape = this.shape();
    if (!shape) return null;
    if (!shape.name.trim()) return 'Name is required';
    if (this.storage.isShapeNameTaken(shape.name, shape.id)) return 'Another shape already uses this name';
    return null;
  });

  private paintValue = true;

  constructor() {
    effect(() => {
      const id = this.shapeId();
      untracked(() => this.load(id));
    });
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  private load(id: string) {
    let shape: Shape | null;
    if (id === 'new') {
      shape = {
        id: '',
        name: this.uniqueName('New shape'),
        description: '',
        size: { ...NEW_SHAPE_SIZE },
        pattern: [],
        inverted: false,
      };
    } else {
      const stored = this.storage.getShape(id);
      shape = stored ? structuredClone(stored) : null;
    }
    this.shape.set(shape);
    // A brand-new shape counts as unsaved only once something was drawn or renamed.
    this.savedSnapshot.set(shape ? JSON.stringify(shape) : '');
  }

  // --- editing ---------------------------------------------------------------------------------

  private edit(fn: (shape: Shape) => Shape) {
    this.shape.update(shape => (shape ? fn(shape) : shape));
  }

  onPixel(event: PixelPointerEvent) {
    const shape = this.shape();
    if (!shape) return;
    if (event.phase === 'start') {
      // Right click always erases; otherwise the first pixel decides whether this stroke draws or erases.
      this.paintValue = event.button === 2 ? false : !this.shapeService.isPixelOn(shape, event.x, event.y);
    }
    if (this.shapeService.isPixelOn(shape, event.x, event.y) === this.paintValue) return;
    this.edit(s => this.shapeService.setPixel(s, event.x, event.y, this.paintValue));
  }

  setName(name: string) {
    this.edit(s => ({ ...s, name }));
  }

  setDescription(description: string) {
    this.edit(s => ({ ...s, description }));
  }

  resize(dimension: 'width' | 'height', delta: number) {
    this.setSize(dimension, (this.shape()?.size[dimension] ?? 0) + delta);
  }

  setSize(dimension: 'width' | 'height', value: number) {
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(this.maxSize[dimension], Math.max(this.minSize()[dimension], Math.round(value)));
    this.edit(s => ({ ...s, size: { ...s.size, [dimension]: clamped } }));
  }

  shift(dx: number, dy: number) {
    this.edit(s => this.shapeService.shiftShape(s, dx, dy));
  }

  flip(axis: 'horizontal' | 'vertical') {
    this.edit(s => this.shapeService.flipShape(s, axis));
  }

  invert() {
    this.edit(s => ({ ...s, pattern: this.shapeService.toSparsePattern(this.shapeService.invertShape(s).pattern) }));
  }

  clear() {
    if (this.activeCount() === 0) return;
    this.dialogs
      .showBooleanDialog('Clear shape?', 'All pixels will be switched off.', { confirmLabel: 'Clear' })
      .subscribe(ok => ok && this.edit(s => ({ ...s, pattern: [] })));
  }

  // --- persistence -----------------------------------------------------------------------------

  save() {
    const shape = this.shape();
    if (!shape) return;
    const error = this.nameError();
    if (error) {
      this.snackBar.open(error, undefined, { duration: 3000 });
      return;
    }

    const toSave: Shape = {
      ...shape,
      id: shape.id || createId('shape'),
      name: shape.name.trim(),
      pattern: this.shapeService.toSparsePattern(shape.pattern),
    };
    this.storage.saveShape(toSave);
    this.shape.set(toSave);
    this.savedSnapshot.set(JSON.stringify(toSave));
    this.snackBar.open(`Saved "${toSave.name}"`, undefined, { duration: 2000 });

    if (this.isNew()) {
      this.router.navigate(['/shapes', toSave.id], { replaceUrl: true });
    }
  }

  delete() {
    const shape = this.shape();
    if (!shape) return;
    this.dialogs
      .showBooleanDialog(`Delete "${shape.name}"?`, this.storage.describeShapeDeletion(shape.id), { confirmLabel: 'Delete' })
      .subscribe(ok => {
        if (!ok) return;
        if (shape.id) this.storage.deleteShape(shape.id);
        this.savedSnapshot.set(JSON.stringify(shape)); // nothing left to lose
        this.router.navigate(['/shapes']);
      });
  }

  // --- keyboard --------------------------------------------------------------------------------

  onKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.save();
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea')) return;
    if (!event.altKey) return;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      this.shift(...move);
    }
  }

  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) event.preventDefault();
  }

  private uniqueName(base: string): string {
    let name = base;
    let n = 2;
    while (this.storage.isShapeNameTaken(name)) name = `${base} ${n++}`;
    return name;
  }
}
