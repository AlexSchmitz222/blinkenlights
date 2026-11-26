import { TestBed } from '@angular/core/testing';
import { ClipboardService } from './clipboard.service';
import { Frame } from '../interfaces/frame.interface';

describe('ClipboardService', () => {
  let clipboard: ClipboardService;
  const frames: Frame[] = [
    { id: 'f1', duration: 100, objects: [{ id: 'o1', type: 'text', text: 'A', position: { x: 0, y: 0 } }] },
    { id: 'f2', duration: 100, objects: [{ id: 'o1', type: 'text', text: 'A', position: { x: 1, y: 0 } }] },
  ];

  beforeEach(() => {
    clipboard = TestBed.inject(ClipboardService);
  });

  it('starts empty', () => {
    expect(clipboard.kind()).toBeNull();
    expect(clipboard.pasteFrames()).toEqual([]);
    expect(clipboard.pasteObjects()).toEqual([]);
  });

  it('pastes frames with fresh ids, keeping an object the same object across the pasted frames', () => {
    clipboard.copyFrames(frames);
    expect(clipboard.kind()).toBe('frames');
    expect(clipboard.count()).toBe(2);
    const pasted = clipboard.pasteFrames();
    expect(pasted.map(f => f.id)).not.toContain('f1');
    const objectIds = pasted.map(f => f.objects[0].id);
    expect(objectIds[0]).not.toBe('o1');
    expect(objectIds[0]).toBe(objectIds[1]);
    // pasting again gives new ids again
    expect(clipboard.pasteFrames()[0].id).not.toBe(pasted[0].id);
  });

  it('stores a copy, so later edits of the original do not change the clipboard', () => {
    const mine = structuredClone(frames);
    clipboard.copyFrames(mine);
    mine[0].duration = 999;
    expect(clipboard.pasteFrames()[0].duration).toBe(100);
  });

  it('replaces frames with objects and pastes objects with new ids', () => {
    clipboard.copyFrames(frames);
    clipboard.copyObjects([frames[0].objects[0]]);
    expect(clipboard.kind()).toBe('objects');
    const [object] = clipboard.pasteObjects();
    expect(object.id).not.toBe('o1');
    expect(object.position).toEqual({ x: 0, y: 0 });
    expect(clipboard.pasteFrames()).toEqual([]);
  });
});
