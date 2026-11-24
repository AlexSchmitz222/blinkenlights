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
    editor.duplicateFrame();
    expect(editor.show()!.scenes[0].frames.length).toBe(3);
    expect(editor.frameIndex()).toBe(1);

    editor.selectFrame(1, 0);
    editor.addText();
    editor.deleteFrame();
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
});
