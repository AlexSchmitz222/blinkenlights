import { TestBed } from '@angular/core/testing';
import { LONG_LINK, ShareService } from './share.service';
import { StorageService } from './storage.service';
import { InvalidFileError } from '../errors/InvalidFile.error';

describe('ShareService', () => {
  let share: ShareService;
  let storage: StorageService;

  beforeEach(() => {
    localStorage.clear();
    share = TestBed.inject(ShareService);
    storage = TestBed.inject(StorageService);
  });

  it('round-trips a show with its shapes through a link', async () => {
    const show = storage.getShow('show_demo_welcome')!;
    const link = await share.createLink(show);
    expect(link).toMatch(/\/share#b1\.[A-Za-z0-9_-]+$/);

    const file = await share.readFragment(new URL(link).hash);
    expect(file.show).toEqual(show);
    expect(file.shapes.map(s => s.id).sort()).toEqual(['heart_filled', 'star']);
  });

  it('keeps the demo shows short enough for messengers', async () => {
    for (const id of ['show_demo_welcome', 'show_demo_berlin']) {
      const link = await share.createLink(storage.getShow(id)!);
      console.info(`share link for ${id}: ${link.length} characters`);
      expect(link.length).toBeLessThan(LONG_LINK);
    }
  });

  it('rejects broken or foreign links with a readable error', async () => {
    await expect(share.readFragment('#nonsense')).rejects.toBeInstanceOf(InvalidFileError);
    await expect(share.readFragment('#b1.@@@')).rejects.toBeInstanceOf(InvalidFileError);
    await expect(share.readFragment('#b1.AAAA')).rejects.toBeInstanceOf(InvalidFileError);
  });
});
