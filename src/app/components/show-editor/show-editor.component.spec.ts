import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShowEditorComponent } from './show-editor.component';
import { StorageService } from '../../core/services/storage.service';
import { Show } from '../../core/interfaces/show.interface';
import { TextObject } from '../../core/interfaces/frame.interface';

describe('ShowEditorComponent', () => {
  let fixture: ComponentFixture<ShowEditorComponent>;
  let editor: ShowEditorComponent;
  let storage: StorageService;

  const testShow: Show = {
    id: 'show_t',
    name: 'Editor test',
    description: '',
    size: { width: 18, height: 8 },
    loop: false,
    scenes: [
      { id: 'sc1', name: 'One', frames: [{ id: 'f1', duration: 100, objects: [] }, { id: 'f2', duration: 100, objects: [] }] },
      { id: 'sc2', name: 'Two', frames: [{ id: 'f3', duration: 100, objects: [] }] },
    ],
  };

  beforeEach(async () => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await TestBed.configureTestingModule({
      imports: [ShowEditorComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    storage = TestBed.inject(StorageService);
    storage.saveShow(testShow);
    fixture = TestBed.createComponent(ShowEditorComponent);
    fixture.componentRef.setInput('showId', 'show_t');
    editor = fixture.componentInstance;
    fixture.detectChanges();
  });

  const frameObjects = () => editor.currentFrame()!.objects;

  it('loads the show clean', () => {
    expect(editor.show()?.name).toBe('Editor test');
    expect(editor.hasUnsavedChanges()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.frame').length).toBe(3);
  });

  it('adds text, becomes dirty, undoes and redoes', () => {
    editor.addText();
    expect(frameObjects().length).toBe(1);
    expect(editor.selectedObject()?.type).toBe('text');
    expect(editor.hasUnsavedChanges()).toBe(true);

    editor.undo();
    expect(frameObjects().length).toBe(0);
    expect(editor.hasUnsavedChanges()).toBe(false);
    expect(editor.selectedId()).toBeNull();

    editor.redo();
    expect(frameObjects().length).toBe(1);
    expect(editor.hasUnsavedChanges()).toBe(true);
  });

  it('merges a drag into one undo step and moves the object with the pointer', () => {
    editor.addText();
    const start = { ...editor.selectedObject()!.position };
    editor.onStagePointer({ x: start.x, y: start.y, phase: 'start', button: 0 });
    editor.onStagePointer({ x: start.x + 1, y: start.y, phase: 'move', button: 0 });
    editor.onStagePointer({ x: start.x + 3, y: start.y + 1, phase: 'move', button: 0 });
    editor.onStagePointerEnd();
    expect(editor.selectedObject()!.position).toEqual({ x: start.x + 3, y: start.y + 1 });

    editor.undo();
    expect(editor.selectedObject()!.position).toEqual(start);
  });

  it('deselects when clicking empty stage', () => {
    editor.addText();
    editor.onStagePointer({ x: 17, y: 7, phase: 'start', button: 0 });
    expect(editor.selectedId()).toBeNull();
  });

  it('saves and is clean afterwards', () => {
    editor.setName('Renamed');
    editor.save();
    expect(editor.hasUnsavedChanges()).toBe(false);
    expect(storage.getShow('show_t')?.name).toBe('Renamed');
  });

  it('duplicates and deletes frames, keeping at least one per scene', () => {
    editor.duplicateFrames();
    expect(editor.show()!.scenes[0].frames.length).toBe(3);
    expect(editor.frameIndex()).toBe(1);

    editor.selectFrame(1, 0);
    editor.addText();
    editor.deleteFrames();
    expect(editor.show()!.scenes[1].frames.length).toBe(1);
    expect(editor.show()!.scenes[1].frames[0].objects).toEqual([]);
  });

  it('steps across scene boundaries', () => {
    editor.selectFrame(0, 1);
    editor.stepFrame(1);
    expect([editor.sceneIndex(), editor.frameIndex()]).toEqual([1, 0]);
    editor.stepFrame(-2);
    expect([editor.sceneIndex(), editor.frameIndex()]).toEqual([0, 0]);
  });

  it('generates a scrolling text scene after the current one', () => {
    (editor as unknown as { applyGenerator(c: unknown): void }).applyGenerator({
      kind: 'scroll', text: 'HI', stepDuration: 50, y: 0, direction: 'left', inverted: false,
    });
    const scenes = editor.show()!.scenes;
    expect(scenes.length).toBe(3);
    expect(scenes[1].name).toContain('HI');
    expect(scenes[1].frames.length).toBe(28);
    expect(editor.sceneIndex()).toBe(1);
  });

  it('applies the selected object to the rest of the scene', () => {
    editor.addText();
    editor.setText('Yo');
    editor.applyToRestOfScene();
    const later = editor.show()!.scenes[0].frames[1].objects[0] as TextObject;
    expect(later.text).toBe('Yo');
  });

  it('merges typing into one undo step', () => {
    editor.addText();
    editor.setText('a');
    editor.setText('ab');
    editor.setText('abc');
    editor.undo();
    expect((editor.selectedObject() as TextObject | null)?.text ?? (frameObjects()[0] as TextObject).text).toBe('Hi!');
  });

  it('inserts typewriter frames after the current frame, on top of its content', () => {
    editor.addText(); // something to keep underneath
    (editor as unknown as { applyGenerator(c: unknown): void }).applyGenerator({
      kind: 'typewriter', text: 'AB', font: 'regular', stepDuration: 100, holdDuration: 500,
    });
    const frames = editor.show()!.scenes[0].frames;
    expect(frames.length).toBe(4); // f1, A, AB, f2
    expect(frames[1].objects.length).toBe(2);
    expect(frames[2].duration).toBe(500);
    expect(frames[3].id).toBe('f2');
  });

  it('wipes from the current to the next frame, also across scenes', () => {
    editor.selectFrame(0, 1);
    (editor as unknown as { applyGenerator(c: unknown): void }).applyGenerator({ kind: 'wipe', direction: 'left', stepDuration: 30 });
    // 18 px wide grid → 17 in-between frames, inserted at the end of scene 1, before scene 2
    expect(editor.show()!.scenes[0].frames.length).toBe(2 + 17);
    expect(editor.show()!.scenes[1].frames[0].id).toBe('f3');
  });

  it('does not open the wipe generator without a next frame', () => {
    editor.selectFrame(1, 0); // the very last frame
    editor.openGenerator('wipe');
    expect(document.querySelector('app-generator-dialog')).toBeNull();
  });

  describe('drafts on detours', () => {
    const reopen = () => {
      fixture = TestBed.createComponent(ShowEditorComponent);
      fixture.componentRef.setInput('showId', 'show_t');
      editor = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('keeps unsaved changes when leaving for a page that returns here, and restores them', () => {
      editor.selectFrame(0, 1);
      editor.addText();
      const objectId = editor.selectedId();
      expect(editor.keepDraftFor('/shapes/new?returnTo=%2Fshows%2Fshow_t')).toBe(true);
      fixture.destroy();

      reopen();
      expect(editor.hasUnsavedChanges()).toBe(true);
      expect([editor.sceneIndex(), editor.frameIndex()]).toEqual([0, 1]);
      expect(editor.selectedId()).toBe(objectId);
      editor.undo(); // the history came back too
      expect(editor.currentFrame()!.objects).toEqual([]);
    });

    it('does not keep anything for pages that do not return here', () => {
      editor.addText();
      expect(editor.keepDraftFor('/shapes/new')).toBe(false);
      expect(editor.keepDraftFor('/shapes/new?returnTo=%2Fshows%2Fother')).toBe(false);
      expect(editor.keepDraftFor('/shows')).toBe(false);
      fixture.destroy();
      reopen();
      expect(editor.hasUnsavedChanges()).toBe(false);
    });

    it('restores a draft only once', () => {
      editor.addText();
      editor.keepDraftFor('/play/show_t?returnTo=%2Fshows%2Fshow_t');
      fixture.destroy();
      reopen();
      fixture.destroy();
      reopen();
      expect(editor.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('clipboard', () => {
    it('copies frames from one show and pastes them into another', () => {
      editor.selectScene(0); // f1, f2
      editor.copy();
      storage.saveShow({ ...testShow, id: 'show_other', name: 'Other', scenes: [{ id: 'x', name: 'X', frames: [{ id: 'x1', duration: 50, objects: [] }] }] });
      fixture.componentRef.setInput('showId', 'show_other');
      fixture.detectChanges();
      expect(editor.show()?.name).toBe('Other');

      editor.paste();
      const frames = editor.show()!.scenes[0].frames;
      expect(frames.length).toBe(3);
      expect(frames[0].id).toBe('x1');
      expect(frames.slice(1).every(f => !['f1', 'f2'].includes(f.id))).toBe(true);
      expect(editor.selectedFrames().length).toBe(2); // the pasted frames are selected
    });

    it('copies the selected object into another frame at the same position', () => {
      editor.addText();
      const original = editor.selectedObject()!;
      editor.copy();
      editor.selectFrame(1, 0);
      editor.paste();
      const pasted = editor.currentFrame()!.objects[0];
      expect(pasted.id).not.toBe(original.id);
      expect(pasted.position).toEqual(original.position);
      expect(editor.selectedId()).toBe(pasted.id);
    });

    it('cuts frames: copied and removed, undo brings them back', () => {
      editor.selectFrame(0, 1);
      editor.cutFrames();
      expect(editor.show()!.scenes[0].frames.map(f => f.id)).toEqual(['f1']);
      editor.paste();
      expect(editor.show()!.scenes[0].frames.length).toBe(2);
    });
  });

  describe('multi-select', () => {
    const durations = () => editor.show()!.scenes.flatMap(s => s.frames.map(f => f.duration));
    const selectedIds = () => editor.selectedFrames().map(f => f.frame.id);

    it('toggles frames with Ctrl/⌘ + click and edits their duration together', () => {
      editor.selectFrame(0, 0);
      editor.onFrameClick(new MouseEvent('click', { ctrlKey: true }), 1, 0);
      expect(selectedIds()).toEqual(['f1', 'f3']);
      expect(editor.multiSelection()).toBe(true);
      // the stage stays on the current frame
      expect([editor.sceneIndex(), editor.frameIndex()]).toEqual([0, 0]);

      editor.setDuration(250);
      expect(durations()).toEqual([250, 100, 250]);
      expect(editor.selectionDuration()).toBe(250);

      editor.undo();
      expect(durations()).toEqual([100, 100, 100]);
    });

    it('reports mixed durations as null', () => {
      editor.setDuration(300);
      editor.onFrameClick(new MouseEvent('click', { shiftKey: true }), 0, 1);
      expect(editor.selectionDuration()).toBeNull();
    });

    it('selects a range with Shift + click, across scenes', () => {
      editor.selectFrame(0, 1);
      editor.onFrameClick(new MouseEvent('click', { shiftKey: true }), 1, 0);
      expect(selectedIds()).toEqual(['f2', 'f3']);
      editor.onFrameClick(new MouseEvent('click', { shiftKey: true }), 0, 0);
      expect(selectedIds()).toEqual(['f1', 'f2']);
    });

    it('removes a frame from the selection with a second Ctrl + click', () => {
      editor.selectScene(0);
      expect(selectedIds()).toEqual(['f1', 'f2']);
      editor.onFrameClick(new MouseEvent('click', { ctrlKey: true }), 0, 0);
      expect(selectedIds()).toEqual(['f2']);
      expect(editor.frameIndex()).toBe(1);
    });

    it('plain click collapses the selection', () => {
      editor.selectScene(0);
      editor.onFrameClick(new MouseEvent('click'), 0, 0);
      expect(selectedIds()).toEqual(['f1']);
    });

    it('duplicates the selection after its last frame and selects the copies', () => {
      editor.selectScene(0);
      editor.duplicateFrames();
      const frames = editor.show()!.scenes[0].frames;
      expect(frames.length).toBe(4);
      expect(frames.slice(0, 2).map(f => f.id)).toEqual(['f1', 'f2']);
      expect(selectedIds()).toEqual(frames.slice(2).map(f => f.id));
    });

    it('deletes the selection but never empties a scene', () => {
      editor.selectFrame(0, 1);
      editor.onFrameClick(new MouseEvent('click', { shiftKey: true }), 1, 0);
      editor.deleteFrames();
      const scenes = editor.show()!.scenes;
      expect(scenes[0].frames.map(f => f.id)).toEqual(['f1']);
      expect(scenes[1].frames.length).toBe(1);
      expect(scenes[1].frames[0].id).not.toBe('f3');
      expect(selectedIds().length).toBe(1);
    });

    it('keeps the object selected while extending the selection, and applies it to all selected frames', () => {
      editor.selectFrame(0, 0);
      editor.addText();
      const objectId = editor.selectedId();
      editor.onFrameClick(new MouseEvent('click', { ctrlKey: true }), 1, 0);
      expect(editor.selectedId()).toBe(objectId);

      editor.applyObjectToSelection();
      expect(editor.show()!.scenes[1].frames[0].objects.map(o => o.id)).toEqual([objectId]);
      expect(editor.show()!.scenes[0].frames[1].objects).toEqual([]);
    });

    it('uses the current frame as anchor for the first Shift + click', () => {
      editor.selectFrame(1, 0);
      editor.onFrameClick(new MouseEvent('click', { shiftKey: true }), 0, 1);
      expect(selectedIds()).toEqual(['f2', 'f3']);
    });

    it('drops ids of frames that no longer exist after undo', () => {
      editor.duplicateFrames();
      editor.undo();
      expect(selectedIds().every(id => ['f1', 'f2', 'f3'].includes(id))).toBe(true);
      expect(selectedIds().length).toBeGreaterThan(0);
    });
  });
});
