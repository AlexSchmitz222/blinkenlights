import { Component, ChangeDetectionStrategy, inject, input, signal, computed, effect, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SHAPE_MAX_SIZE, Shape } from '../../core/interfaces/shape.interface';
import { ShapeService } from '../../core/services/shape.service';
import { StorageService } from '../../core/services/storage.service';
import { BasicDialogService } from '../../core/services/basic-dialog.service';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { PixelGridComponent, PixelPointerEvent } from '../../shared/pixel-grid/pixel-grid.component';
import { createId } from '../../core/utils/id';
import { safeReturnUrl } from '../../core/utils/return-to';
import { I18nService, TranslationKey } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { shapeDeletionMessage } from '../shape-list/shape-deletion';

const HISTORY_LIMIT = 200;

export type DrawTool = 'pencil' | 'line' | 'rect' | 'rectFilled' | 'fill';

interface ToolDefinition {
  id: DrawTool;
  icon: string;
  label: TranslationKey;
  key: string;
}

/** Drawing tools with their keyboard shortcut. */
export const DRAW_TOOLS: ToolDefinition[] = [
  { id: 'pencil', icon: 'pencil', label: 'shapeEditor.toolPencil', key: 'p' },
  { id: 'line', icon: 'vector-line', label: 'shapeEditor.toolLine', key: 'l' },
  { id: 'rect', icon: 'rectangle-outline', label: 'shapeEditor.toolRect', key: 'r' },
  { id: 'rectFilled', icon: 'rectangle', label: 'shapeEditor.toolRectFilled', key: 'b' },
  { id: 'fill', icon: 'format-color-fill', label: 'shapeEditor.toolFill', key: 'f' },
];
const NEW_SHAPE_SIZE = { width: 8, height: 8 };

@Component({
  selector: 'app-shape-details',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatTooltipModule, PixelGridComponent, TranslatePipe],
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
  private i18n = inject(I18nService);

  /** Route parameter (`/shapes/:shapeId`); 'new' creates a shape. */
  readonly shapeId = input.required<string>();
  /** Query parameter: where "back" leads, e.g. the show editor that opened this shape. */
  readonly returnTo = input<string>();

  readonly backLink = computed(() => safeReturnUrl(this.returnTo()) ?? '/shapes');
  readonly backLabel = computed<TranslationKey>(() => (safeReturnUrl(this.returnTo()) ? 'common.back' : 'common.backToShapes'));

  readonly maxSize = SHAPE_MAX_SIZE;
  readonly dimensions = ['width', 'height'] as const;
  readonly dimensionLabels: Record<'width' | 'height', TranslationKey> = { width: 'shapeEditor.width', height: 'shapeEditor.height' };
  readonly tools: { icon: string; label: TranslationKey; action: () => void }[] = [
    { icon: 'arrow-up', label: 'shapeEditor.moveUp', action: () => this.shift(0, -1) },
    { icon: 'arrow-down', label: 'shapeEditor.moveDown', action: () => this.shift(0, 1) },
    { icon: 'arrow-left', label: 'shapeEditor.moveLeft', action: () => this.shift(-1, 0) },
    { icon: 'arrow-right', label: 'shapeEditor.moveRight', action: () => this.shift(1, 0) },
    { icon: 'flip-horizontal', label: 'shapeEditor.flipHorizontal', action: () => this.flip('horizontal') },
    { icon: 'flip-vertical', label: 'shapeEditor.flipVertical', action: () => this.flip('vertical') },
    { icon: 'invert-colors', label: 'shapeEditor.invert', action: () => this.invert() },
    { icon: 'eraser', label: 'shapeEditor.clear', action: () => this.clear() },
  ];
  readonly drawTools = DRAW_TOOLS;
  readonly tool = signal<DrawTool>('pencil');
  readonly shape = signal<Shape | null>(null);
  readonly isNew = computed(() => this.shapeId() === 'new');
  readonly debug = signal(false);

  // undo/redo: snapshots of the shape before each change (a whole stroke counts as one change)
  private past = signal<Shape[]>([]);
  private future = signal<Shape[]>([]);
  private lastCoalesceKey: string | null = null;
  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);

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

  readonly nameError = computed<TranslationKey | null>(() => {
    const shape = this.shape();
    if (!shape) return null;
    if (!shape.name.trim()) return 'shapeEditor.nameRequired';
    if (this.storage.isShapeNameTaken(shape.name, shape.id)) return 'shapeEditor.nameTaken';
    return null;
  });

  private paintValue = true;
  /** For line/rectangle: where the drag started and the shape before it (the preview is redrawn from it). */
  private stroke: { start: { x: number; y: number }; base: Shape; id: number } | null = null;
  private strokeCount = 0;

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
        name: this.uniqueName(this.i18n.t('shapeEditor.defaultName')),
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
    this.past.set([]);
    this.future.set([]);
    this.lastCoalesceKey = null;
    // A brand-new shape counts as unsaved only once something was drawn or renamed.
    this.savedSnapshot.set(shape ? JSON.stringify(shape) : '');
  }

  // --- editing ---------------------------------------------------------------------------------

  /**
   * Applies a change and records it for undo. Consecutive changes with the same `coalesceKey`
   * (one stroke, typing into one field) become a single undo step.
   */
  private edit(fn: (shape: Shape) => Shape, coalesceKey?: string) {
    const current = this.shape();
    if (!current) return;
    const next = fn(current);
    if (next === current) return;
    if (!coalesceKey || coalesceKey !== this.lastCoalesceKey) {
      this.past.update(past => [...past, current].slice(-HISTORY_LIMIT));
    }
    this.future.set([]);
    this.lastCoalesceKey = coalesceKey ?? null;
    this.shape.set(next);
  }

  undo() {
    const past = this.past();
    const current = this.shape();
    if (!past.length || !current) return;
    this.future.update(f => [...f, current]);
    this.past.set(past.slice(0, -1));
    this.shape.set(past[past.length - 1]);
    this.lastCoalesceKey = null;
  }

  redo() {
    const future = this.future();
    const current = this.shape();
    if (!future.length || !current) return;
    this.past.update(p => [...p, current]);
    this.future.set(future.slice(0, -1));
    this.shape.set(future[future.length - 1]);
    this.lastCoalesceKey = null;
  }

  onPixel(event: PixelPointerEvent) {
    const shape = this.shape();
    if (!shape) return;
    const tool = this.tool();
    const { x, y } = event;

    if (event.phase === 'start') {
      this.strokeCount++;
      // Right click always erases. The pencil toggles: starting on a lit pixel erases.
      this.paintValue = event.button === 2 ? false : tool === 'pencil' || tool === 'fill' ? !this.shapeService.isPixelOn(shape, x, y) : true;
      this.stroke = { start: { x, y }, base: shape, id: this.strokeCount };
    }
    const key = `stroke:${this.strokeCount}`;

    switch (tool) {
      case 'pencil':
        if (this.shapeService.isPixelOn(shape, x, y) === this.paintValue) return;
        this.edit(s => this.shapeService.setPixel(s, x, y, this.paintValue), key);
        break;
      case 'fill':
        if (event.phase !== 'start') return;
        this.edit(s => this.shapeService.setPixels(s, this.shapeService.fillRegion(s, x, y), this.paintValue), key);
        break;
      case 'line':
      case 'rect':
      case 'rectFilled': {
        if (!this.stroke) return;
        const { start, base } = this.stroke;
        const points = tool === 'line'
          ? this.shapeService.linePoints(start.x, start.y, x, y)
          : this.shapeService.rectPoints(start.x, start.y, x, y, tool === 'rectFilled');
        // always redraw from the shape before the drag, so moving the pointer back shrinks the preview
        this.edit(() => this.shapeService.setPixels(base, points, this.paintValue), key);
        break;
      }
    }
  }

  onPixelEnd() {
    this.stroke = null;
  }

  setTool(tool: DrawTool) {
    this.tool.set(tool);
  }

  setName(name: string) {
    this.edit(s => ({ ...s, name }), 'name');
  }

  setDescription(description: string) {
    this.edit(s => ({ ...s, description }), 'description');
  }

  resize(dimension: 'width' | 'height', delta: number) {
    this.setSize(dimension, (this.shape()?.size[dimension] ?? 0) + delta);
  }

  setSize(dimension: 'width' | 'height', value: number) {
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(this.maxSize[dimension], Math.max(this.minSize()[dimension], Math.round(value)));
    this.edit(s => (s.size[dimension] === clamped ? s : { ...s, size: { ...s.size, [dimension]: clamped } }), `size:${dimension}`);
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
      .showBooleanDialog(this.i18n.t('shapeEditor.clearTitle'), this.i18n.t('shapeEditor.clearMessage'), { confirmLabel: this.i18n.t('shapeEditor.clear') })
      .subscribe(ok => ok && this.edit(s => ({ ...s, pattern: [] })));
  }

  // --- persistence -----------------------------------------------------------------------------

  save() {
    const shape = this.shape();
    if (!shape) return;
    const error = this.nameError();
    if (error) {
      this.snackBar.open(this.i18n.t(error), undefined, { duration: 3000 });
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
    this.snackBar.open(this.i18n.t('common.saved', { name: toSave.name }), undefined, { duration: 2000 });

    if (this.isNew()) {
      // keep ?returnTo, so the back button still leads to where the user came from
      this.router.navigate(['/shapes', toSave.id], { replaceUrl: true, queryParamsHandling: 'preserve' });
    }
  }

  delete() {
    const shape = this.shape();
    if (!shape) return;
    this.dialogs
      .showBooleanDialog(this.i18n.t('common.deleteTitle', { name: shape.name }), shapeDeletionMessage(this.i18n, this.storage, shape.id), { confirmLabel: this.i18n.t('common.delete') })
      .subscribe(ok => {
        if (!ok) return;
        if (shape.id) this.storage.deleteShape(shape.id);
        this.savedSnapshot.set(JSON.stringify(shape)); // nothing left to lose
        this.router.navigateByUrl(this.backLink());
      });
  }

  // --- keyboard --------------------------------------------------------------------------------

  onKeydown(event: KeyboardEvent) {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && key === 's') {
      event.preventDefault();
      this.save();
      return;
    }
    // keys can also arrive on window/document, which have no closest()
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, .cdk-overlay-container')) return;
    if (mod && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (mod && key === 'y') {
      event.preventDefault();
      this.redo();
      return;
    }
    if (!mod && !event.altKey) {
      const tool = DRAW_TOOLS.find(t => t.key === key);
      if (tool) {
        event.preventDefault();
        this.setTool(tool.id);
      }
      return;
    }
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
