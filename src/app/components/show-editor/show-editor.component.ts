import {
  Component, ChangeDetectionStrategy, inject, input, signal, computed, effect, untracked, ElementRef, viewChild, afterRenderEffect,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Show, GRID_PRESETS, findPreset } from '../../core/interfaces/show.interface';
import { Frame, FrameObject, TextObject } from '../../core/interfaces/frame.interface';
import { Grid, Size } from '../../core/interfaces/grid.interface';
import { Shape } from '../../core/interfaces/shape.interface';
import { StorageService } from '../../core/services/storage.service';
import { RenderService } from '../../core/services/render.service';
import { ShapeService } from '../../core/services/shape.service';
import { PlayerService } from '../../core/services/player.service';
import { ShowGeneratorService } from '../../core/services/show-generator.service';
import { ShowFileService } from '../../core/services/show-file.service';
import { TextDrawService } from '../../core/services/text-draw.service';
import { BasicDialogService } from '../../core/services/basic-dialog.service';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { PixelGridComponent, PixelPointerEvent, GridHighlight } from '../../shared/pixel-grid/pixel-grid.component';
import { GridThumbComponent } from '../../shared/grid-thumb/grid-thumb.component';
import { GeneratorConfig, GeneratorDialogComponent, GeneratorDialogData, GeneratorKind } from './generator-dialog.component';
import { createId } from '../../core/utils/id';
import { I18nService, TranslationKey } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import * as edit from '../../core/utils/show-edit';
import { GifExportFlow } from '../show-list/gif-export.flow';
import { ClipboardService } from '../../core/services/clipboard.service';

interface HistoryEntry {
  show: Show;
  revision: number;
}

const HISTORY_LIMIT = 200;
const DEFAULT_FRAME_DURATION = 500;

@Component({
  selector: 'app-show-editor',
  imports: [
    RouterLink, DragDropModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, MatSelectModule,
    MatSlideToggleModule, PixelGridComponent, GridThumbComponent, TranslatePipe,
  ],
  providers: [PlayerService],
  templateUrl: './show-editor.component.html',
  styleUrl: './show-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeydown($event)',
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class ShowEditorComponent implements HasUnsavedChanges {
  private storage = inject(StorageService);
  private render = inject(RenderService);
  private shapeService = inject(ShapeService);
  private generator = inject(ShowGeneratorService);
  private files = inject(ShowFileService);
  private text = inject(TextDrawService);
  private dialogs = inject(BasicDialogService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private i18n = inject(I18nService);
  private gifExport = inject(GifExportFlow);
  readonly clipboard = inject(ClipboardService);
  readonly player = inject(PlayerService);

  /** Route parameter `/shows/:showId`. */
  readonly showId = input.required<string>();

  readonly presets = GRID_PRESETS;
  readonly show = signal<Show | null>(null);
  readonly sceneIndex = signal(0);
  readonly frameIndex = signal(0);
  readonly selectedId = signal<string | null>(null);
  /** Frames selected in the timeline (by id). The current frame is always part of the selection. */
  private readonly selectedFrameIds = signal<ReadonlySet<string>>(new Set());
  private selectionAnchor: string | null = null;
  readonly onionSkin = signal(false);
  readonly debug = signal(false);
  readonly menuPosition = signal({ x: 0, y: 0 });
  protected readonly Math = Math;

  // --- history / dirty tracking ----------------------------------------------------------------
  private revision = signal(0);
  private savedRevision = signal(0);
  private past = signal<HistoryEntry[]>([]);
  private future = signal<HistoryEntry[]>([]);
  private lastCoalesceKey: string | null = null;
  readonly dirty = computed(() => this.revision() !== this.savedRevision());
  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);

  // --- derived state ---------------------------------------------------------------------------
  private shapeMap = computed(() => new Map(this.storage.shapes().map(s => [s.id, s])));
  readonly resolveShape = (id: string): Shape | undefined => this.shapeMap().get(id);

  readonly shapes = computed(() =>
    [...this.storage.shapes()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(shape => ({ shape, grid: this.shapeService.transformShapeToGrid(shape) })),
  );

  readonly currentScene = computed(() => this.show()?.scenes[this.sceneIndex()] ?? null);
  readonly currentFrame = computed(() => this.currentScene()?.frames[this.frameIndex()] ?? null);
  readonly selectedObject = computed(() => this.currentFrame()?.objects.find(o => o.id === this.selectedId()) ?? null);
  readonly previewing = computed(() => this.player.playing());

  /**
   * The selected frames in timeline order. Ids that no longer exist (after undo, delete, …) are
   * ignored, and the current frame is always included.
   */
  readonly selectedFrames = computed(() => {
    const ids = this.selectedFrameIds();
    const current = this.currentFrame();
    const result: { sceneIndex: number; frameIndex: number; frame: Frame }[] = [];
    this.show()?.scenes.forEach((scene, sceneIndex) =>
      scene.frames.forEach((frame, frameIndex) => {
        if (ids.has(frame.id) || frame === current) result.push({ sceneIndex, frameIndex, frame });
      }),
    );
    return result;
  });
  readonly selectedFrameIdSet = computed(() => new Set(this.selectedFrames().map(f => f.frame.id)));
  readonly multiSelection = computed(() => this.selectedFrames().length > 1);
  /** Duration shared by all selected frames, or null if they differ. */
  readonly selectionDuration = computed(() => {
    const durations = new Set(this.selectedFrames().map(f => f.frame.duration));
    return durations.size === 1 ? [...durations][0] : null;
  });
  readonly selectionDurationTotal = computed(() => this.i18n.duration(this.selectedFrames().reduce((t, f) => t + f.frame.duration, 0)));
  readonly presetId = computed(() => {
    const show = this.show();
    return show ? findPreset(show.size)?.id ?? 'custom' : 'custom';
  });

  /** The frame shown on the stage: the preview's frame while playing, else the selected one. */
  private stageFrame = computed<Frame | null>(() => (this.previewing() ? this.player.current()?.frame ?? null : this.currentFrame()));

  readonly stageGrid = computed<Grid | null>(() => {
    const show = this.show();
    return show ? this.render.renderFrame(this.stageFrame(), show.size, this.resolveShape) : null;
  });

  readonly ghostGrid = computed<Grid | null>(() => {
    const show = this.show();
    if (!show || !this.onionSkin() || this.previewing()) return null;
    const previous = this.frameAt(this.flatIndex(this.sceneIndex(), this.frameIndex()) - 1);
    return previous ? this.render.renderFrame(previous, show.size, this.resolveShape) : null;
  });

  readonly highlights = computed<GridHighlight[]>(() => {
    const object = this.selectedObject();
    if (!object || this.previewing()) return [];
    return [{ ...this.render.getBounds(object, this.resolveShape), kind: 'selected' }];
  });

  /** Timeline thumbnails, cached per frame object (unchanged frames keep their identity). */
  private thumbCache = new WeakMap<Frame, Grid>();
  private thumbCacheShapes: Map<string, Shape> | null = null;
  readonly thumbs = computed<Grid[][]>(() => {
    const show = this.show();
    const shapes = this.shapeMap();
    if (shapes !== this.thumbCacheShapes) {
      this.thumbCache = new WeakMap();
      this.thumbCacheShapes = shapes;
    }
    if (!show) return [];
    return show.scenes.map(scene =>
      scene.frames.map(frame => {
        let grid = this.thumbCache.get(frame);
        if (!grid) {
          grid = this.render.renderFrame(frame, show.size, this.resolveShape);
          this.thumbCache.set(frame, grid);
        }
        return grid;
      }),
    );
  });

  readonly thumbWidth = computed(() => {
    const size = this.show()?.size ?? { width: 1, height: 1 };
    return Math.min(120, Math.max(36, Math.round((44 * size.width) / size.height)));
  });

  readonly playhead = computed(() => {
    const entry = this.previewing() ? this.player.current() : null;
    return entry ? { scene: entry.sceneIndex, frame: entry.frameIndex } : null;
  });

  readonly sceneStats = computed(() =>
    (this.show()?.scenes ?? []).map(scene => this.i18n.duration(scene.frames.reduce((t, f) => t + f.duration, 0))),
  );

  readonly totalDuration = computed(() =>
    this.i18n.duration((this.show()?.scenes ?? []).reduce((t, s) => t + s.frames.reduce((u, f) => u + f.duration, 0), 0)),
  );

  private timelineEl = viewChild<ElementRef<HTMLElement>>('timeline');
  private drag: { objectId: string; offsetX: number; offsetY: number; gesture: number } | null = null;
  private gesture = 0;

  constructor() {
    effect(() => {
      const id = this.showId();
      untracked(() => this.load(id));
    });

    // When the preview stops, stay on the frame it stopped at.
    let wasPlaying = false;
    effect(() => {
      const playing = this.player.playing();
      untracked(() => {
        if (wasPlaying && !playing) {
          const entry = this.player.current();
          if (entry) this.selectFrame(entry.sceneIndex, entry.frameIndex);
        }
        wasPlaying = playing;
      });
    });

    // Keep the selected (or playing) frame visible in the timeline.
    afterRenderEffect(() => {
      this.sceneIndex();
      this.frameIndex();
      this.playhead();
      const el = this.timelineEl()?.nativeElement.querySelector('.frame.playing, .frame.current');
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  private load(id: string) {
    const stored = this.storage.getShow(id);
    this.player.load(null);
    this.show.set(stored ? structuredClone(stored) : null);
    this.sceneIndex.set(0);
    this.frameIndex.set(0);
    this.selectedId.set(null);
    this.selectedFrameIds.set(new Set());
    this.selectionAnchor = null;
    this.past.set([]);
    this.future.set([]);
    this.revision.set(0);
    this.savedRevision.set(0);
    this.lastCoalesceKey = null;
  }

  // --- editing core ----------------------------------------------------------------------------

  /**
   * Applies a change. Consecutive edits with the same `coalesceKey` (a drag, typing into one field)
   * become a single undo step.
   */
  private edit(fn: (show: Show) => Show, coalesceKey?: string) {
    const current = this.show();
    if (!current) return;
    const next = fn(current);
    if (next === current) return;

    if (!coalesceKey || coalesceKey !== this.lastCoalesceKey) {
      this.past.update(past => [...past, { show: current, revision: this.revision() }].slice(-HISTORY_LIMIT));
    }
    this.future.set([]);
    this.lastCoalesceKey = coalesceKey ?? null;
    this.revision.update(r => r + 1);
    this.show.set(next);
    if (this.player.playing()) this.player.pause();
  }

  undo() {
    const past = this.past();
    const current = this.show();
    if (!past.length || !current) return;
    const entry = past[past.length - 1];
    this.past.set(past.slice(0, -1));
    this.future.update(f => [...f, { show: current, revision: this.revision() }]);
    this.restore(entry);
  }

  redo() {
    const future = this.future();
    const current = this.show();
    if (!future.length || !current) return;
    const entry = future[future.length - 1];
    this.future.set(future.slice(0, -1));
    this.past.update(p => [...p, { show: current, revision: this.revision() }]);
    this.restore(entry);
  }

  private restore(entry: HistoryEntry) {
    this.lastCoalesceKey = null;
    this.show.set(entry.show);
    this.revision.set(entry.revision);
    this.clampSelection();
  }

  private clampSelection() {
    const show = this.show();
    if (!show) return;
    const si = Math.min(this.sceneIndex(), Math.max(0, show.scenes.length - 1));
    const fi = Math.min(this.frameIndex(), Math.max(0, (show.scenes[si]?.frames.length ?? 1) - 1));
    this.sceneIndex.set(si);
    this.frameIndex.set(fi);
    if (!this.currentFrame()?.objects.some(o => o.id === this.selectedId())) this.selectedId.set(null);
  }

  // --- navigation ------------------------------------------------------------------------------

  /**
   * Selects frames in the timeline.
   * - 'single' (plain click): only this frame is selected and becomes the current one (shown on the stage)
   * - 'toggle' (Ctrl/⌘ + click): adds or removes it from the selection
   * - 'range' (Shift + click): selects everything from the last clicked frame to this one
   *
   * Toggle and range only change the selection; the stage stays on the current frame, so a selected
   * object stays selected and can be applied to all selected frames.
   */
  selectFrame(sceneIndex: number, frameIndex: number, mode: 'single' | 'toggle' | 'range' = 'single') {
    const frame = this.show()?.scenes[sceneIndex]?.frames[frameIndex];
    if (!frame) return;
    const currentFrame = this.currentFrame();
    const selection = new Set(this.selectedFrames().map(f => f.frame.id));

    if (mode === 'toggle') {
      this.selectionAnchor = frame.id;
      if (!selection.has(frame.id)) {
        selection.add(frame.id);
        this.selectedFrameIds.set(selection);
        return;
      }
      if (selection.size === 1) return; // can't deselect the only frame
      selection.delete(frame.id);
      this.selectedFrameIds.set(selection);
      if (frame === currentFrame) {
        // the current frame left the selection: move to the nearest remaining one
        const remaining = this.selectedFrames().filter(f => f.frame !== currentFrame);
        const clicked = this.flatIndex(sceneIndex, frameIndex);
        const next = remaining.find(f => this.flatIndex(f.sceneIndex, f.frameIndex) > clicked) ?? remaining.at(-1)!;
        this.setCurrent(next.sceneIndex, next.frameIndex);
      }
      return;
    }

    if (mode === 'range') {
      const anchor = this.findFrame(this.selectionAnchor ?? currentFrame?.id ?? frame.id);
      const from = anchor ? this.flatIndex(anchor.sceneIndex, anchor.frameIndex) : this.flatIndex(sceneIndex, frameIndex);
      const to = this.flatIndex(sceneIndex, frameIndex);
      const ids = new Set<string>();
      for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
        const f = this.frameAt(i);
        if (f) ids.add(f.id);
      }
      this.selectionAnchor ??= currentFrame?.id ?? frame.id;
      this.selectedFrameIds.set(ids);
      if (!currentFrame || !ids.has(currentFrame.id)) this.setCurrent(sceneIndex, frameIndex);
      return;
    }

    this.selectedFrameIds.set(new Set([frame.id]));
    this.selectionAnchor = frame.id;
    this.setCurrent(sceneIndex, frameIndex);
  }

  onFrameClick(event: MouseEvent, sceneIndex: number, frameIndex: number) {
    const mode = event.shiftKey ? 'range' : event.ctrlKey || event.metaKey ? 'toggle' : 'single';
    this.selectFrame(sceneIndex, frameIndex, mode);
  }

  /** Selects all frames of the current scene. */
  selectScene(sceneIndex = this.sceneIndex()) {
    const scene = this.show()?.scenes[sceneIndex];
    if (!scene?.frames.length) return;
    this.selectedFrameIds.set(new Set(scene.frames.map(f => f.id)));
    this.selectionAnchor = scene.frames[0].id;
    if (this.sceneIndex() !== sceneIndex) this.setCurrent(sceneIndex, 0);
  }

  /** Reduces a multi-selection to the current frame. */
  collapseSelection() {
    const frame = this.currentFrame();
    if (frame) this.selectedFrameIds.set(new Set([frame.id]));
  }

  private setCurrent(sceneIndex: number, frameIndex: number) {
    this.sceneIndex.set(sceneIndex);
    this.frameIndex.set(frameIndex);
    // Keep the same object selected if it also exists in the new frame.
    if (!this.currentFrame()?.objects.some(o => o.id === this.selectedId())) this.selectedId.set(null);
    this.lastCoalesceKey = null;
  }

  private findFrame(id: string): { sceneIndex: number; frameIndex: number } | null {
    const scenes = this.show()?.scenes ?? [];
    for (let s = 0; s < scenes.length; s++) {
      const f = scenes[s].frames.findIndex(frame => frame.id === id);
      if (f > -1) return { sceneIndex: s, frameIndex: f };
    }
    return null;
  }

  stepFrame(delta: number) {
    const target = this.flatIndex(this.sceneIndex(), this.frameIndex()) + delta;
    const location = this.locate(target);
    if (location) this.selectFrame(location.scene, location.frame);
  }

  private flatIndex(sceneIndex: number, frameIndex: number): number {
    const scenes = this.show()?.scenes ?? [];
    return scenes.slice(0, sceneIndex).reduce((n, s) => n + s.frames.length, 0) + frameIndex;
  }

  private locate(flat: number): { scene: number; frame: number } | null {
    if (flat < 0) return null;
    const scenes = this.show()?.scenes ?? [];
    let rest = flat;
    for (let s = 0; s < scenes.length; s++) {
      if (rest < scenes[s].frames.length) return { scene: s, frame: rest };
      rest -= scenes[s].frames.length;
    }
    return null;
  }

  private frameAt(flat: number): Frame | null {
    const location = this.locate(flat);
    return location ? this.show()!.scenes[location.scene].frames[location.frame] : null;
  }

  togglePreview() {
    const show = this.show();
    if (!show) return;
    if (this.player.playing()) {
      this.player.pause();
      return;
    }
    this.player.load(show);
    this.player.seek(this.flatIndex(this.sceneIndex(), this.frameIndex()));
    this.player.play();
  }

  // --- stage -----------------------------------------------------------------------------------

  onStagePointer(event: PixelPointerEvent) {
    if (this.previewing()) {
      this.player.pause();
      return;
    }
    const frame = this.currentFrame();
    if (!frame) return;

    if (event.phase === 'start') {
      const hit = [...frame.objects].reverse().find(o => {
        const b = this.render.getBounds(o, this.resolveShape);
        return event.x >= b.x && event.x < b.x + b.width && event.y >= b.y && event.y < b.y + b.height;
      });
      this.selectedId.set(hit?.id ?? null);
      this.drag = hit
        ? { objectId: hit.id, offsetX: event.x - hit.position.x, offsetY: event.y - hit.position.y, gesture: ++this.gesture }
        : null;
      return;
    }

    if (this.drag) {
      const { objectId, offsetX, offsetY, gesture } = this.drag;
      this.updateSelected(
        o => ({ ...o, position: { x: event.x - offsetX, y: event.y - offsetY } }),
        `drag:${objectId}:${gesture}`,
        objectId,
      );
    }
  }

  onStagePointerEnd() {
    this.drag = null;
  }

  // --- objects ---------------------------------------------------------------------------------

  private centered(size: Size): { x: number; y: number } {
    const grid = this.show()?.size ?? size;
    return { x: Math.floor((grid.width - size.width) / 2), y: Math.floor((grid.height - size.height) / 2) };
  }

  addShape(shape: Shape) {
    this.addObject({ id: createId('obj'), type: 'shape', shapeId: shape.id, position: this.centered(shape.size) });
  }

  addText() {
    const text = this.i18n.t('editor.defaultText');
    const size = this.text.measureText(text);
    this.addObject({ id: createId('obj'), type: 'text', text, position: this.centered({ width: size.width, height: this.text.capHeight }) });
  }

  private addObject(object: FrameObject) {
    if (!this.currentFrame()) return;
    this.edit(show => edit.addObject(show, this.sceneIndex(), this.frameIndex(), object));
    this.selectedId.set(object.id);
  }

  private updateSelected(fn: (object: FrameObject) => FrameObject, coalesceKey?: string, objectId = this.selectedId()) {
    if (!objectId) return;
    this.edit(show => edit.updateObject(show, this.sceneIndex(), this.frameIndex(), objectId, fn), coalesceKey);
  }

  setPosition(axis: 'x' | 'y', value: number) {
    if (!Number.isFinite(value)) return;
    this.updateSelected(o => ({ ...o, position: { ...o.position, [axis]: Math.round(value) } }), `pos:${this.selectedId()}`);
  }

  nudge(dx: number, dy: number) {
    this.updateSelected(o => ({ ...o, position: { x: o.position.x + dx, y: o.position.y + dy } }), `nudge:${this.selectedId()}`);
  }

  setInverted(inverted: boolean) {
    this.updateSelected(o => ({ ...o, inverted }));
  }

  setText(value: string) {
    this.updateSelected(o => (o.type === 'text' ? { ...o, text: value } : o), `text:${this.selectedId()}`);
  }

  setFont(font: 'regular' | 'small') {
    this.updateSelected(o => (o.type === 'text' ? { ...o, font: font === 'regular' ? undefined : font } : o));
  }

  setSpacing(value: number) {
    if (!Number.isFinite(value)) return;
    this.updateSelected(o => (o.type === 'text' ? { ...o, spacing: Math.max(0, Math.round(value)) } : o), `spacing:${this.selectedId()}`);
  }

  setShapeId(shapeId: string) {
    this.updateSelected(o => (o.type === 'shape' ? { ...o, shapeId } : o));
  }

  reorderSelected(delta: number) {
    const id = this.selectedId();
    if (id) this.edit(show => edit.reorderObject(show, this.sceneIndex(), this.frameIndex(), id, delta));
  }

  duplicateSelected() {
    const object = this.selectedObject();
    if (!object) return;
    this.addObject({ ...structuredClone(object), id: createId('obj'), position: { x: object.position.x + 1, y: object.position.y + 1 } });
  }

  deleteSelected() {
    const id = this.selectedId();
    if (!id) return;
    this.edit(show => edit.removeObject(show, this.sceneIndex(), this.frameIndex(), id));
    this.selectedId.set(null);
  }

  /** Copies the selected object's current state into all later frames of the scene that contain it. */
  applyToRestOfScene() {
    const object = this.selectedObject();
    if (!object) return;
    const si = this.sceneIndex();
    const from = this.frameIndex();
    this.edit(show =>
      edit.updateScene(show, si, scene => ({
        ...scene,
        frames: scene.frames.map((frame, fi) =>
          fi <= from
            ? frame
            : frame.objects.some(o => o.id === object.id)
              ? { ...frame, objects: frame.objects.map(o => (o.id === object.id ? structuredClone(object) : o)) }
              : { ...frame, objects: [...frame.objects, structuredClone(object)] },
        ),
      })),
    );
    this.snackBar.open(this.i18n.t('editor.appliedToRest'), undefined, { duration: 2000 });
  }

  objectLabel(object: FrameObject): string {
    switch (object.type) {
      case 'shape': return this.resolveShape(object.shapeId)?.name ?? this.i18n.t('editor.missingShape');
      case 'text': return `“${object.text}”`;
      case 'bitmap': return this.i18n.t('editor.bitmapLabel', { width: object.size.width, height: object.size.height });
    }
  }

  objectIcon(object: FrameObject): string {
    return { shape: 'shape-outline', text: 'format-text', bitmap: 'grid' }[object.type];
  }

  objectTypeLabel(object: FrameObject): TranslationKey {
    return `editor.objectTypes.${object.type}`;
  }

  asText(object: FrameObject): TextObject | null {
    return object.type === 'text' ? object : null;
  }

  // --- frames ----------------------------------------------------------------------------------

  /** Applies `fn` to every selected frame. */
  private editSelectedFrames(fn: (frame: Frame) => Frame, coalesceKey?: string) {
    const ids = this.selectedFrameIdSet();
    if (!ids.size) return;
    this.edit(show => ({
      ...show,
      scenes: show.scenes.map(scene =>
        scene.frames.some(f => ids.has(f.id)) ? { ...scene, frames: scene.frames.map(f => (ids.has(f.id) ? fn(f) : f)) } : scene,
      ),
    }), coalesceKey);
  }

  /** Sets the duration of all selected frames. */
  setDuration(value: number) {
    if (!Number.isFinite(value)) return;
    const duration = Math.max(0, Math.round(value));
    this.editSelectedFrames(f => ({ ...f, duration }), `duration:${[...this.selectedFrameIdSet()].join(',')}`);
  }

  setHold(hold: boolean) {
    this.setDuration(hold ? 0 : DEFAULT_FRAME_DURATION);
  }

  /** Copies the selected object into every selected frame (replacing it where it already exists). */
  applyObjectToSelection() {
    const object = this.selectedObject();
    if (!object) return;
    this.editSelectedFrames(frame =>
      frame.objects.some(o => o.id === object.id)
        ? { ...frame, objects: frame.objects.map(o => (o.id === object.id ? structuredClone(object) : o)) }
        : { ...frame, objects: [...frame.objects, structuredClone(object)] },
    );
    this.snackBar.open(this.i18n.t('editor.appliedToFrames', { count: this.selectedFrames().length }), undefined, { duration: 2000 });
  }

  /** Applies the current frame's duration to every frame in the scene. */
  applyDurationToScene() {
    const frame = this.currentFrame();
    if (!frame) return;
    const si = this.sceneIndex();
    this.edit(show => edit.updateScene(show, si, scene => ({ ...scene, frames: scene.frames.map(f => ({ ...f, duration: frame.duration })) })));
  }

  /** Adds a copy of the scene's last frame at its end (or an empty frame). */
  addFrame(sceneIndex: number) {
    const scene = this.show()?.scenes[sceneIndex];
    if (!scene) return;
    const last = scene.frames.at(-1);
    const frame = last ? edit.copyFrame(last) : { id: createId('frame'), duration: DEFAULT_FRAME_DURATION, objects: [] };
    this.edit(show => edit.insertFrames(show, sceneIndex, scene.frames.length, [frame]));
    this.selectFrame(sceneIndex, scene.frames.length);
  }

  insertEmptyFrameAfter() {
    const si = this.sceneIndex();
    const fi = this.frameIndex();
    const duration = this.currentFrame()?.duration || DEFAULT_FRAME_DURATION;
    this.edit(show => edit.insertFrames(show, si, fi + 1, [{ id: createId('frame'), duration, objects: [] }]));
    this.selectFrame(si, fi + 1);
  }

  // --- clipboard -------------------------------------------------------------------------------

  /** Ctrl+C: the selected object if there is one, otherwise the selected frames. */
  copy() {
    const object = this.selectedObject();
    if (object) {
      this.clipboard.copyObjects([object]);
      this.snackBar.open(this.i18n.t('editor.copiedObject'), undefined, { duration: 1500 });
    } else {
      this.copyFrames();
    }
  }

  /** Ctrl+X: copy, then remove what was copied. */
  cut() {
    if (this.selectedObject()) {
      this.copy();
      this.deleteSelected();
    } else {
      this.cutFrames();
    }
  }

  copyFrames() {
    const frames = this.selectedFrames().map(f => f.frame);
    this.clipboard.copyFrames(frames);
    this.snackBar.open(this.i18n.t('editor.copiedFrames', { count: frames.length }), undefined, { duration: 1500 });
  }

  cutFrames() {
    this.copyFrames();
    this.deleteFrames();
  }

  /** Ctrl+V: objects go into the current frame (same position), frames go after the current frame. */
  paste() {
    const si = this.sceneIndex();
    const fi = this.frameIndex();
    if (this.clipboard.kind() === 'objects') {
      const objects = this.clipboard.pasteObjects();
      if (!this.currentFrame() || !objects.length) return;
      this.edit(show => objects.reduce((s, o) => edit.addObject(s, si, fi, o), show));
      this.selectedId.set(objects.at(-1)!.id);
      this.snackBar.open(this.i18n.t('editor.pastedObjects', { count: objects.length }), undefined, { duration: 1500 });
    } else if (this.clipboard.kind() === 'frames') {
      const frames = this.clipboard.pasteFrames();
      if (!this.show()?.scenes[si] || !frames.length) return;
      this.edit(show => edit.insertFrames(show, si, fi + 1, frames));
      this.selectedFrameIds.set(new Set(frames.map(f => f.id)));
      this.selectionAnchor = frames[0].id;
      this.setCurrent(si, fi + 1);
      this.snackBar.open(this.i18n.t('editor.pastedFrames', { count: frames.length }), undefined, { duration: 1500 });
    }
  }

  /**
   * Duplicates the selected frames. The copies are inserted (in order) right after the last
   * selected frame and become the new selection.
   */
  duplicateFrames() {
    const selected = this.selectedFrames();
    const last = selected.at(-1);
    if (!last) return;
    const copies = selected.map(s => edit.copyFrame(s.frame));
    this.edit(show => edit.insertFrames(show, last.sceneIndex, last.frameIndex + 1, copies));
    this.selectedFrameIds.set(new Set(copies.map(c => c.id)));
    this.selectionAnchor = copies[0].id;
    this.setCurrent(last.sceneIndex, last.frameIndex + copies.length);
  }

  /** Deletes the selected frames. A scene never ends up empty: its last frame is cleared instead. */
  deleteFrames() {
    const selected = this.selectedFrames();
    if (!selected.length) return;
    const ids = new Set(selected.map(s => s.frame.id));
    const first = selected[0];
    this.edit(show => ({
      ...show,
      scenes: show.scenes.map(scene => {
        if (!scene.frames.some(f => ids.has(f.id))) return scene;
        const kept = scene.frames.filter(f => !ids.has(f.id));
        return {
          ...scene,
          frames: kept.length ? kept : [{ ...scene.frames[0], id: createId('frame'), objects: [] }],
        };
      }),
    }));
    const scene = this.show()!.scenes[first.sceneIndex];
    const frameIndex = Math.min(first.frameIndex, scene.frames.length - 1);
    this.selectFrame(first.sceneIndex, frameIndex);
    if (selected.length > 1) {
      this.snackBar.open(this.i18n.t('editor.deletedFrames', { count: selected.length }), this.i18n.t('common.undo'), { duration: 4000 }).onAction().subscribe(() => this.undo());
    }
  }

  openFrameMenu(event: MouseEvent, trigger: MatMenuTrigger, sceneIndex: number, frameIndex: number) {
    event.preventDefault();
    // Right-clicking inside the selection keeps it; outside, it selects just that frame.
    const frame = this.show()?.scenes[sceneIndex]?.frames[frameIndex];
    if (frame && this.selectedFrameIdSet().has(frame.id)) this.setCurrent(sceneIndex, frameIndex);
    else this.selectFrame(sceneIndex, frameIndex);
    this.menuPosition.set({ x: event.clientX, y: event.clientY });
    // let the anchor move before the menu measures its position
    setTimeout(() => trigger.openMenu());
  }

  dropFrame(event: CdkDragDrop<number>) {
    const fromScene = event.previousContainer.data;
    const toScene = event.container.data;
    if (fromScene === toScene && event.previousIndex === event.currentIndex) return;
    this.edit(show => edit.moveFrame(show, fromScene, event.previousIndex, toScene, event.currentIndex));
    this.selectFrame(toScene, event.currentIndex);
  }

  // --- scenes ----------------------------------------------------------------------------------

  addScene() {
    const show = this.show();
    if (!show) return;
    const index = show.scenes.length;
    let n = index + 1;
    while (show.scenes.some(s => s.name === this.i18n.t('editor.sceneDefaultName', { n }))) n++;
    this.edit(s => edit.insertScene(s, index, {
      id: createId('scene'),
      name: this.i18n.t('editor.sceneDefaultName', { n }),
      frames: [{ id: createId('frame'), duration: DEFAULT_FRAME_DURATION, objects: [] }],
    }));
    this.selectFrame(index, 0);
  }

  renameScene(sceneIndex: number, name: string) {
    const id = this.show()?.scenes[sceneIndex]?.id;
    this.edit(show => edit.updateScene(show, sceneIndex, scene => ({ ...scene, name })), `scene-name:${id}`);
  }

  duplicateScene(sceneIndex: number) {
    const scene = this.show()?.scenes[sceneIndex];
    if (!scene) return;
    this.edit(show => edit.insertScene(show, sceneIndex + 1, edit.copyScene(scene, this.i18n.t('editor.sceneCopy', { name: scene.name }))));
    this.selectFrame(sceneIndex + 1, 0);
  }

  moveScene(sceneIndex: number, delta: number) {
    const target = sceneIndex + delta;
    if (target < 0 || target >= (this.show()?.scenes.length ?? 0)) return;
    this.edit(show => edit.moveScene(show, sceneIndex, target));
    this.selectFrame(target, 0);
  }

  deleteScene(sceneIndex: number) {
    const show = this.show();
    const scene = show?.scenes[sceneIndex];
    if (!show || !scene) return;
    this.dialogs
      .showBooleanDialog(
        this.i18n.t('editor.deleteSceneTitle', { name: scene.name }),
        this.i18n.t('editor.deleteSceneMessage', { count: scene.frames.length }),
        { confirmLabel: this.i18n.t('common.delete') },
      )
      .subscribe(ok => {
        if (!ok) return;
        if (show.scenes.length === 1) {
          this.edit(s => ({ ...s, scenes: [{ id: createId('scene'), name: this.i18n.t('shows.firstScene'), frames: [{ id: createId('frame'), duration: DEFAULT_FRAME_DURATION, objects: [] }] }] }));
          this.selectFrame(0, 0);
        } else {
          this.edit(s => edit.removeScene(s, sceneIndex));
          this.selectFrame(Math.min(sceneIndex, show.scenes.length - 2), 0);
        }
      });
  }

  // --- show ------------------------------------------------------------------------------------

  setName(name: string) {
    this.edit(show => ({ ...show, name }), 'show-name');
  }

  setDescription(description: string) {
    this.edit(show => ({ ...show, description }), 'show-description');
  }

  setLoop(loop: boolean) {
    this.edit(show => ({ ...show, loop }));
  }

  setPreset(id: string) {
    const preset = GRID_PRESETS.find(p => p.id === id);
    if (preset) this.edit(show => ({ ...show, size: { ...preset.size } }));
  }

  save() {
    const show = this.show();
    if (!show) return;
    const name = show.name.trim();
    if (!name) {
      this.snackBar.open(this.i18n.t('editor.nameRequired'), undefined, { duration: 3000 });
      return;
    }
    if (this.storage.isShowNameTaken(name, show.id)) {
      this.snackBar.open(this.i18n.t('editor.nameTaken'), undefined, { duration: 3000 });
      return;
    }
    const saved = this.storage.saveShow({ ...show, name });
    this.show.set(saved);
    this.savedRevision.set(this.revision());
    this.snackBar.open(this.i18n.t('common.saved', { name: saved.name }), undefined, { duration: 2000 });
  }

  export() {
    const show = this.show();
    if (show) this.files.exportShow(show);
  }

  exportGif() {
    const show = this.show();
    if (show) this.gifExport.start(show);
  }

  exportMovie(format: 'blm' | 'bml') {
    const show = this.show();
    if (show) this.files.exportMovie(show, format);
  }

  // --- generators ------------------------------------------------------------------------------

  openGenerator(kind: GeneratorKind) {
    const show = this.show();
    if (!show) return;
    if (kind === 'move' && !this.selectedObject()) {
      this.snackBar.open(this.i18n.t('editor.selectObjectToMove'), undefined, { duration: 3000 });
      return;
    }
    if (kind === 'wipe' && !this.nextFrame()) {
      this.snackBar.open(this.i18n.t('editor.noNextFrame'), undefined, { duration: 3000 });
      return;
    }
    const data: GeneratorDialogData = {
      kind,
      from: this.selectedObject()?.position,
      defaultY: {
        regular: Math.floor((show.size.height - this.text.capHeightOf('regular')) / 2),
        small: Math.floor((show.size.height - this.text.capHeightOf('small')) / 2),
      },
    };
    this.dialog
      .open<GeneratorDialogComponent, GeneratorDialogData, GeneratorConfig>(GeneratorDialogComponent, { data, width: '480px', maxWidth: '94vw' })
      .afterClosed()
      .subscribe(config => config && this.applyGenerator(config));
  }

  private applyGenerator(config: GeneratorConfig) {
    const show = this.show();
    const frame = this.currentFrame();
    if (!show) return;
    const si = this.sceneIndex();
    const fi = this.frameIndex();

    switch (config.kind) {
      case 'scroll': {
        const frames = this.generator.scrollText(config.text, show.size, config);
        const scene = { id: createId('scene'), name: this.i18n.t('editor.scrollSceneName', { text: config.text }), frames };
        this.edit(s => edit.insertScene(s, si + 1, scene));
        this.selectFrame(si + 1, 0);
        this.snackBar.open(this.i18n.t('editor.addedScene', { count: frames.length }), undefined, { duration: 2500 });
        break;
      }
      case 'move': {
        const object = this.selectedObject();
        if (!object || !frame) return;
        const background = frame.objects.filter(o => o.id !== object.id);
        // The first generated frame equals the current one, so skip it.
        const frames = this.generator.moveObject(object, config.to, config.steps, config.stepDuration, background).slice(1);
        this.edit(s => edit.insertFrames(s, si, fi + 1, frames));
        this.selectFrame(si, fi + frames.length);
        break;
      }
      case 'blink': {
        if (!frame) return;
        const frames = this.generator.blink(frame.objects, config.times, config.onDuration, config.offDuration, config.mode);
        this.edit(s => edit.insertFrames(s, si, fi + 1, frames));
        this.selectFrame(si, fi + 1);
        break;
      }
      case 'typewriter': {
        const frames = this.generator.typewriter(config.text, show.size, {
          font: config.font,
          stepDuration: config.stepDuration,
          holdDuration: config.holdDuration,
          background: frame?.objects ?? [],
        });
        this.edit(s => edit.insertFrames(s, si, fi + 1, frames));
        this.selectFrame(si, fi + frames.length);
        this.snackBar.open(this.i18n.t('editor.addedFrames', { count: frames.length }), undefined, { duration: 2500 });
        break;
      }
      case 'sparkle': {
        const frames = this.generator.sparkle(show.size, {
          frames: config.frames,
          density: config.density,
          stepDuration: config.stepDuration,
          background: config.keepFrame ? frame?.objects ?? [] : [],
        });
        this.edit(s => edit.insertFrames(s, si, fi + 1, frames));
        this.selectFrame(si, fi + 1);
        this.snackBar.open(this.i18n.t('editor.addedFrames', { count: frames.length }), undefined, { duration: 2500 });
        break;
      }
      case 'wipe': {
        const next = this.nextFrame();
        if (!frame || !next) return;
        const from = this.render.renderFrame(frame, show.size, this.resolveShape);
        const to = this.render.renderFrame(next, show.size, this.resolveShape);
        const frames = this.generator.wipe(from, to, { direction: config.direction, stepDuration: config.stepDuration });
        this.edit(s => edit.insertFrames(s, si, fi + 1, frames));
        this.selectFrame(si, fi + 1);
        this.snackBar.open(this.i18n.t('editor.addedFrames', { count: frames.length }), undefined, { duration: 2500 });
        break;
      }
    }
  }

  /** The frame after the current one in play order (possibly the first frame of the next scene). */
  private nextFrame(): Frame | null {
    return this.frameAt(this.flatIndex(this.sceneIndex(), this.frameIndex()) + 1);
  }

  // --- keyboard --------------------------------------------------------------------------------

  onKeydown(event: KeyboardEvent) {
    // keys can also arrive on window/document, which have no closest()
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('.cdk-overlay-container')) return; // dialogs and menus handle their own keys
    const typing = !!target?.closest('input, textarea, select, mat-select, [contenteditable]');
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (mod && key === 's') return this.handled(event, () => this.save());
    if (typing) return;
    if (mod && key === 'z' && !event.shiftKey) return this.handled(event, () => this.undo());
    if ((mod && key === 'z' && event.shiftKey) || (mod && key === 'y')) return this.handled(event, () => this.redo());
    if (mod && key === 'd') return this.handled(event, () => this.duplicateFrames());
    if (mod && key === 'c') return this.handled(event, () => this.copy());
    if (mod && key === 'x') return this.handled(event, () => this.cut());
    if (mod && key === 'v') return this.handled(event, () => this.paste());
    if (mod && key === 'a') return this.handled(event, () => this.selectScene());
    if (mod || event.altKey) return;

    const step = event.shiftKey ? 5 : 1;
    const selected = !!this.selectedObject();
    switch (event.key) {
      case ' ': return this.handled(event, () => this.togglePreview());
      case 'Escape': return this.handled(event, () => (selected ? this.selectedId.set(null) : this.collapseSelection()));
      case 'Delete':
      case 'Backspace': return this.handled(event, () => (selected ? this.deleteSelected() : this.deleteFrames()));
      case 'ArrowLeft': return this.handled(event, () => (selected ? this.nudge(-step, 0) : this.stepFrame(-1)));
      case 'ArrowRight': return this.handled(event, () => (selected ? this.nudge(step, 0) : this.stepFrame(1)));
      case 'ArrowUp': return selected ? this.handled(event, () => this.nudge(0, -step)) : undefined;
      case 'ArrowDown': return selected ? this.handled(event, () => this.nudge(0, step)) : undefined;
      case ',': return this.handled(event, () => this.stepFrame(-1));
      case '.': return this.handled(event, () => this.stepFrame(1));
      case 'o': return this.handled(event, () => this.onionSkin.update(v => !v));
    }
  }

  private handled(event: KeyboardEvent, action: () => void) {
    event.preventDefault();
    action();
  }

  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) event.preventDefault();
  }
}
