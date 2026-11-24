import { TestBed } from '@angular/core/testing';
import { STORAGE_KEY, StorageService } from './storage.service';
import { DEFAULT_SHAPES } from '../../shapes/shapes.shapes';
import { Shape } from '../interfaces/shape.interface';

describe('StorageService', () => {
  const shape: Shape = {
    id: 'shape_a',
    name: 'Alpha',
    description: '',
    size: { width: 2, height: 2 },
    pattern: [{ position: { x: 0, y: 0 }, active: true }],
    inverted: false,
  };

  function create(): StorageService {
    TestBed.resetTestingModule();
    return TestBed.inject(StorageService);
  }

  beforeEach(() => localStorage.clear());

  it('seeds the default shapes on first start and persists them', () => {
    const storage = create();
    expect(storage.shapes().map(s => s.id)).toEqual(DEFAULT_SHAPES.map(s => s.id));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).version).toBe(1);
  });

  it('migrates shapes from the legacy "shapes" key (id becomes name, inactive pixels dropped)', () => {
    localStorage.setItem('shapes', JSON.stringify([{
      id: 'My Shape',
      description: 'old',
      size: { width: 1, height: 2 },
      pattern: [{ position: { x: 0, y: 0 }, active: true }, { position: { x: 0, y: 1 }, active: false }],
      inverted: false,
    }]));

    const storage = create();
    expect(storage.shapes()).toEqual([{
      id: 'My Shape',
      name: 'My Shape',
      description: 'old',
      size: { width: 1, height: 2 },
      pattern: [{ position: { x: 0, y: 0 }, active: true }],
      inverted: false,
    }]);
    expect(localStorage.getItem('shapes')).not.toBeNull(); // legacy data is left alone
  });

  it('updates an existing shape instead of duplicating it when renamed', () => {
    const storage = create();
    storage.saveShape(shape);
    storage.saveShape({ ...shape, name: 'Renamed' });

    const matches = storage.shapes().filter(s => s.id === 'shape_a');
    expect(matches.length).toBe(1);
    expect(matches[0].name).toBe('Renamed');
  });

  it('survives a reload', () => {
    create().saveShape(shape);
    expect(create().getShape('shape_a')?.name).toBe('Alpha');
  });

  it('stores a copy, so later mutations of the caller object are not saved', () => {
    const storage = create();
    const mine = structuredClone(shape);
    storage.saveShape(mine);
    mine.name = 'mutated';
    expect(storage.getShape('shape_a')?.name).toBe('Alpha');
  });

  it('deletes shapes', () => {
    const storage = create();
    storage.saveShape(shape);
    storage.deleteShape('shape_a');
    expect(storage.getShape('shape_a')).toBeUndefined();
  });

  it('detects taken names case-insensitively, ignoring the shape itself', () => {
    const storage = create();
    storage.saveShape(shape);
    expect(storage.isShapeNameTaken(' alpha ')).toBe(true);
    expect(storage.isShapeNameTaken('Alpha', 'shape_a')).toBe(false);
    expect(storage.isShapeNameTaken('Beta')).toBe(false);
  });

  it('starts fresh when the saved data is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(create().shapes().length).toBe(DEFAULT_SHAPES.length);
  });
});
