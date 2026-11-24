import { Show } from '../interfaces/show.interface';
import { Scene } from '../interfaces/scene.interface';
import { Frame, FrameObject } from '../interfaces/frame.interface';
import { createId } from './id';

/*
 * Immutable helpers for editing shows. Each function returns a new show and only re-creates the
 * scenes/frames on the path to the change, so unchanged frames keep their identity (cheap caching).
 */

function replaceAt<T>(items: T[], index: number, item: T): T[] {
  const copy = [...items];
  copy[index] = item;
  return copy;
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length, index));
}

// --- scenes --------------------------------------------------------------------------------------

export function updateScene(show: Show, sceneIndex: number, fn: (scene: Scene) => Scene): Show {
  const scene = show.scenes[sceneIndex];
  if (!scene) return show;
  return { ...show, scenes: replaceAt(show.scenes, sceneIndex, fn(scene)) };
}

export function insertScene(show: Show, index: number, scene: Scene): Show {
  const scenes = [...show.scenes];
  scenes.splice(clampIndex(index, scenes.length), 0, scene);
  return { ...show, scenes };
}

export function removeScene(show: Show, sceneIndex: number): Show {
  return { ...show, scenes: show.scenes.filter((_, i) => i !== sceneIndex) };
}

export function moveScene(show: Show, from: number, to: number): Show {
  if (from === to || !show.scenes[from]) return show;
  const scenes = [...show.scenes];
  const [scene] = scenes.splice(from, 1);
  scenes.splice(clampIndex(to, scenes.length), 0, scene);
  return { ...show, scenes };
}

// --- frames --------------------------------------------------------------------------------------

export function updateFrame(show: Show, sceneIndex: number, frameIndex: number, fn: (frame: Frame) => Frame): Show {
  return updateScene(show, sceneIndex, scene => {
    const frame = scene.frames[frameIndex];
    return frame ? { ...scene, frames: replaceAt(scene.frames, frameIndex, fn(frame)) } : scene;
  });
}

export function insertFrames(show: Show, sceneIndex: number, index: number, frames: Frame[]): Show {
  return updateScene(show, sceneIndex, scene => {
    const copy = [...scene.frames];
    copy.splice(clampIndex(index, copy.length), 0, ...frames);
    return { ...scene, frames: copy };
  });
}

export function removeFrame(show: Show, sceneIndex: number, frameIndex: number): Show {
  return updateScene(show, sceneIndex, scene => ({ ...scene, frames: scene.frames.filter((_, i) => i !== frameIndex) }));
}

/** Moves a frame, also between scenes. `toIndex` is the index in the target scene after removal. */
export function moveFrame(show: Show, fromScene: number, fromIndex: number, toScene: number, toIndex: number): Show {
  const frame = show.scenes[fromScene]?.frames[fromIndex];
  if (!frame || !show.scenes[toScene]) return show;
  if (fromScene === toScene && fromIndex === toIndex) return show;
  return insertFrames(removeFrame(show, fromScene, fromIndex), toScene, toIndex, [frame]);
}

// --- objects -------------------------------------------------------------------------------------

export function updateObject(
  show: Show, sceneIndex: number, frameIndex: number, objectId: string, fn: (object: FrameObject) => FrameObject,
): Show {
  return updateFrame(show, sceneIndex, frameIndex, frame => ({
    ...frame,
    objects: frame.objects.map(o => (o.id === objectId ? fn(o) : o)),
  }));
}

export function addObject(show: Show, sceneIndex: number, frameIndex: number, object: FrameObject): Show {
  return updateFrame(show, sceneIndex, frameIndex, frame => ({ ...frame, objects: [...frame.objects, object] }));
}

export function removeObject(show: Show, sceneIndex: number, frameIndex: number, objectId: string): Show {
  return updateFrame(show, sceneIndex, frameIndex, frame => ({ ...frame, objects: frame.objects.filter(o => o.id !== objectId) }));
}

/** Moves an object up (+1, drawn later = on top) or down (-1) in the drawing order. */
export function reorderObject(show: Show, sceneIndex: number, frameIndex: number, objectId: string, delta: number): Show {
  return updateFrame(show, sceneIndex, frameIndex, frame => {
    const from = frame.objects.findIndex(o => o.id === objectId);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= frame.objects.length) return frame;
    const objects = [...frame.objects];
    const [object] = objects.splice(from, 1);
    objects.splice(to, 0, object);
    return { ...frame, objects };
  });
}

// --- copies --------------------------------------------------------------------------------------

/** Deep copy with a new frame id. Object ids are kept so an object stays "the same" across frames. */
export function copyFrame(frame: Frame): Frame {
  return { ...structuredClone(frame), id: createId('frame') };
}

export function copyScene(scene: Scene, name = `${scene.name} copy`): Scene {
  return { id: createId('scene'), name, frames: scene.frames.map(copyFrame) };
}
