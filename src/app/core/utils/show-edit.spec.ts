import { Show } from '../interfaces/show.interface';
import { Frame } from '../interfaces/frame.interface';
import {
  addObject, copyFrame, copyScene, insertFrames, insertScene, moveFrame, moveScene, removeFrame,
  removeObject, removeScene, reorderObject, updateObject,
} from './show-edit';

function frame(id: string): Frame {
  return { id, duration: 100, objects: [] };
}

function makeShow(): Show {
  return {
    id: 's',
    name: 'S',
    description: '',
    size: { width: 4, height: 4 },
    loop: false,
    scenes: [
      { id: 'A', name: 'A', frames: [frame('a1'), frame('a2'), frame('a3')] },
      { id: 'B', name: 'B', frames: [frame('b1')] },
    ],
  };
}

const ids = (show: Show) => show.scenes.map(s => `${s.id}:${s.frames.map(f => f.id).join(',')}`);

describe('show-edit', () => {
  it('keeps the identity of untouched scenes and frames', () => {
    const show = makeShow();
    const next = addObject(show, 0, 1, { id: 'o', type: 'text', text: 'x', position: { x: 0, y: 0 } });
    expect(next).not.toBe(show);
    expect(next.scenes[1]).toBe(show.scenes[1]);
    expect(next.scenes[0].frames[0]).toBe(show.scenes[0].frames[0]);
    expect(next.scenes[0].frames[1]).not.toBe(show.scenes[0].frames[1]);
    expect(show.scenes[0].frames[1].objects).toEqual([]); // input untouched
  });

  it('inserts, removes and moves frames, also across scenes', () => {
    let show = insertFrames(makeShow(), 1, 0, [frame('b0')]);
    expect(ids(show)).toEqual(['A:a1,a2,a3', 'B:b0,b1']);
    show = removeFrame(show, 0, 1);
    expect(ids(show)).toEqual(['A:a1,a3', 'B:b0,b1']);
    show = moveFrame(show, 0, 0, 1, 2);
    expect(ids(show)).toEqual(['A:a3', 'B:b0,b1,a1']);
    show = moveFrame(show, 1, 2, 1, 0);
    expect(ids(show)).toEqual(['A:a3', 'B:a1,b0,b1']);
  });

  it('inserts, removes and moves scenes', () => {
    let show = moveScene(makeShow(), 1, 0);
    expect(show.scenes.map(s => s.id)).toEqual(['B', 'A']);
    show = insertScene(show, 99, { id: 'C', name: 'C', frames: [] });
    expect(show.scenes.map(s => s.id)).toEqual(['B', 'A', 'C']);
    show = removeScene(show, 0);
    expect(show.scenes.map(s => s.id)).toEqual(['A', 'C']);
  });

  it('updates, reorders and removes objects', () => {
    let show = makeShow();
    show = addObject(show, 0, 0, { id: 'o1', type: 'text', text: '1', position: { x: 0, y: 0 } });
    show = addObject(show, 0, 0, { id: 'o2', type: 'text', text: '2', position: { x: 0, y: 0 } });
    show = updateObject(show, 0, 0, 'o1', o => ({ ...o, position: { x: 3, y: 2 } }));
    expect(show.scenes[0].frames[0].objects[0].position).toEqual({ x: 3, y: 2 });

    show = reorderObject(show, 0, 0, 'o1', 1);
    expect(show.scenes[0].frames[0].objects.map(o => o.id)).toEqual(['o2', 'o1']);
    // already on top: order stays the same
    expect(reorderObject(show, 0, 0, 'o1', 1).scenes[0].frames[0].objects.map(o => o.id)).toEqual(['o2', 'o1']);

    show = removeObject(show, 0, 0, 'o2');
    expect(show.scenes[0].frames[0].objects.map(o => o.id)).toEqual(['o1']);
  });

  it('copies frames and scenes with new ids', () => {
    const show = makeShow();
    const f = copyFrame(show.scenes[0].frames[0]);
    expect(f.id).not.toBe('a1');
    const scene = copyScene(show.scenes[0]);
    expect(scene.name).toBe('A copy');
    expect(scene.frames.length).toBe(3);
    expect(scene.frames.map(x => x.id)).not.toContain('a1');
  });
});
