import { TestBed } from '@angular/core/testing';
import { InvalidFileError, ShowFile, ShowFileService } from './show-file.service';
import { StorageService } from './storage.service';
import { Show } from '../interfaces/show.interface';
import { Shape } from '../interfaces/shape.interface';

describe('ShowFileService', () => {
  let files: ShowFileService;
  let storage: StorageService;

  const dot: Shape = {
    id: 'shape_dot',
    name: 'Dot',
    description: '',
    size: { width: 1, height: 1 },
    pattern: [{ position: { x: 0, y: 0 }, active: true }],
    inverted: false,
  };

  const show: Show = {
    id: 'show_test',
    name: 'Test show',
    description: '',
    size: { width: 4, height: 4 },
    loop: false,
    scenes: [{
      id: 'scene',
      name: 'Scene',
      frames: [{
        id: 'frame',
        duration: 100,
        objects: [
          { id: 'o1', type: 'shape', shapeId: 'shape_dot', position: { x: 1, y: 1 } },
          { id: 'o2', type: 'text', text: 'A', position: { x: 0, y: 0 } },
        ],
      }],
    }],
  };

  beforeEach(() => {
    localStorage.clear();
    files = TestBed.inject(ShowFileService);
    storage = TestBed.inject(StorageService);
    storage.saveShape(dot);
  });

  it('exports a show together with exactly the shapes it uses', () => {
    const file = files.createShowFile(show);
    expect(file.format).toBe('blinkenlights-show');
    expect(file.shapes.map(s => s.id)).toEqual(['shape_dot']);
  });

  it('round-trips export → parse → import into an empty browser', () => {
    const content = JSON.stringify(files.createShowFile(show));
    storage.replaceAll([], []);

    const parsed = files.parse(content) as ShowFile;
    const result = files.importShow(parsed, 'replace');

    expect(storage.getShow('show_test')?.scenes).toEqual(show.scenes);
    expect(storage.getShape('shape_dot')).toEqual(dot);
    expect(result.addedShapes.length).toBe(1);
  });

  it('reuses identical shapes instead of duplicating them', () => {
    const result = files.importShow(files.createShowFile(show), 'replace');
    expect(result.addedShapes).toEqual([]);
    expect(storage.shapes().filter(s => s.name.startsWith('Dot')).length).toBe(1);
  });

  it('imports a conflicting shape under a new id and rewires the show', () => {
    const file = files.createShowFile(show);
    file.shapes[0] = { ...dot, size: { width: 2, height: 1 } }; // same id, different content

    const result = files.importShow(file, 'replace');
    const newId = result.addedShapes[0].id;
    expect(newId).not.toBe('shape_dot');
    expect(result.addedShapes[0].name).toBe('Dot (2)');
    expect(storage.getShape('shape_dot')).toEqual(dot); // the existing shape is untouched
    const object = result.show.scenes[0].frames[0].objects[0];
    expect(object.type === 'shape' && object.shapeId).toBe(newId);
  });

  it('keeps both shows when asked', () => {
    storage.saveShow(show);
    const result = files.importShow(files.createShowFile(show), 'keep-both');
    expect(result.show.id).not.toBe('show_test');
    expect(result.show.name).toBe('Test show (2)');
    expect(storage.getShow('show_test')).toBeTruthy();
  });

  it('replaces an existing show when asked', () => {
    storage.saveShow({ ...show, name: 'Old name' });
    files.importShow(files.createShowFile(show), 'replace');
    expect(storage.getShow('show_test')?.name).toBe('Test show');
  });

  it('restores a backup', () => {
    storage.saveShow(show);
    const backup = files.parse(JSON.stringify(files.createBackup()));
    storage.replaceAll([], []);
    expect(backup.format).toBe('blinkenlights-backup');
    if (backup.format === 'blinkenlights-backup') files.restoreBackup(backup);
    expect(storage.getShow('show_test')).toBeTruthy();
    expect(storage.getShape('shape_dot')).toBeTruthy();
  });

  it('rejects broken or foreign files with a readable message', () => {
    expect(() => files.parse('{nope')).toThrowError(InvalidFileError);
    expect(() => files.parse('{"format":"other"}')).toThrowError(/not a Blinkenlights file/);
    const broken = files.createShowFile(show);
    (broken.show.size as { width: number }).width = -1;
    expect(() => files.parse(JSON.stringify(broken))).toThrowError(/grid size/);
  });
});
