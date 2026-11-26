import { TestBed } from '@angular/core/testing';
import { LONG_LINK, ShareService } from './share.service';
import { StorageService } from './storage.service';
import { ShowGeneratorService } from './show-generator.service';
import { RenderService } from './render.service';
import { BlinkenFormatService } from './blinken-format.service';
import { InvalidFileError } from '../errors/InvalidFile.error';
import { Show } from '../interfaces/show.interface';

/** The show without what a link leaves out: ids of scenes, frames and objects (they get new ones) and timestamps. */
function withoutIds({ createdAt: _c, updatedAt: _u, ...show }: Show) {
  return {
    ...show,
    scenes: show.scenes.map(scene => ({
      name: scene.name,
      frames: scene.frames.map(frame => ({ duration: frame.duration, objects: frame.objects.map(({ id: _, ...rest }) => rest) })),
    })),
  };
}

/** A b1 link (the first, plain format) for the given text, to check old links still open. */
async function legacyFragment(json: string): Promise<string> {
  const source = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(json)); c.close(); } });
  const reader = source.pipeThrough(new CompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>).getReader();
  const parts: number[] = [];
  for (let r = await reader.read(); !r.done; r = await reader.read()) parts.push(...r.value);
  return '#b1.' + btoa(String.fromCharCode(...parts)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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
    expect(link).toMatch(/\/share#b2\.[A-Za-z0-9_-]+$/);

    const file = await share.readFragment(new URL(link).hash);
    expect(withoutIds(file.show)).toEqual(withoutIds(show));
    expect(file.shapes).toEqual([storage.getShape('heart_filled'), storage.getShape('star')]);
  });

  it('keeps an object that moves through several frames one object', async () => {
    const show = storage.getShow('show_demo_welcome')!;
    const file = await share.readFragment(new URL(await share.createLink(show)).hash);
    const starFrames = file.show.scenes[1].frames;
    expect(new Set(starFrames.map(f => f.objects[0].id)).size).toBe(1);
    expect(starFrames[0].objects[0].id).not.toBe(show.scenes[1].frames[0].objects[0].id); // but a new id
  });

  it('keeps text at x = 0 / y = 0, small fonts, spacing and flags', async () => {
    const show: Show = {
      id: 's', name: 'Flags', description: '', size: { width: 18, height: 8 }, loop: false,
      scenes: [{ id: 'sc', name: 'S', frames: [{ id: 'f', duration: 0, objects: [
        { id: 'a', type: 'text', text: 'A', position: { x: 0, y: 0 } },
        { id: 'b', type: 'text', text: 'B', position: { x: -3, y: 2 }, font: 'small', spacing: 2, inverted: true },
        { id: 'c', type: 'bitmap', position: { x: 0, y: 0 }, size: { width: 3, height: 2 }, rows: ['101', '010'], transparent: true },
      ] }] }],
    };
    const file = await share.readFragment(new URL(await share.createLink(show)).hash);
    expect(withoutIds(file.show)).toEqual(withoutIds(show));
  });

  it('still opens links in the first (b1) format', async () => {
    const show = storage.getShow('show_demo_berlin')!;
    const plain = JSON.stringify({ format: 'blinkenlights-show', version: 1, show, shapes: [] });
    const file = await share.readFragment(await legacyFragment(plain));
    expect(file.show).toEqual(show);
  });

  describe('link length', () => {
    async function length(show: Show) {
      return (await share.createLink(show)).length;
    }

    it('keeps the demo shows well under Discord’s 2000 characters', async () => {
      const welcome = await length(storage.getShow('show_demo_welcome')!);
      const berlin = await length(storage.getShow('show_demo_berlin')!);
      console.info(`demo links: Welcome ${welcome}, Hallo Berlin ${berlin} characters`);
      expect(welcome).toBeLessThan(1000);
      expect(berlin).toBeLessThan(600);
    });

    it('fits a show that uses every generator', async () => {
      const gen = TestBed.inject(ShowGeneratorService);
      const render = TestBed.inject(RenderService);
      const size = { width: 39, height: 21 };
      const scroll = gen.scrollText('Blinkenlights rocks!', size);
      const typed = gen.typewriter('Hallo Welt', size);
      const sparkle = gen.sparkle(size, { frames: 12, density: 0.06, seed: 1 });
      const wipe = gen.wipe(render.renderFrame(typed.at(-1), size, () => undefined), render.renderFrame(scroll[20], size, () => undefined));
      const show: Show = {
        id: 'show_all', name: 'Everything', description: '', size, loop: true,
        scenes: [
          { id: 'a', name: 'Scroll', frames: scroll },
          { id: 'b', name: 'Type', frames: typed },
          { id: 'c', name: 'Sparkle', frames: sparkle },
          { id: 'd', name: 'Wipe', frames: wipe },
        ],
      };
      for (const scene of show.scenes) {
        console.info(`  scene ${scene.name} (${scene.frames.length} frames): ${await length({ ...show, scenes: [scene] })} characters`);
      }
      const chars = await length(show);
      console.info(`link with every generator (${show.scenes.reduce((n, s) => n + s.frames.length, 0)} frames): ${chars} characters`);
      expect(chars).toBeLessThan(LONG_LINK);
    });

    it('reports how long an imported pixel movie gets', async () => {
      const formats = TestBed.inject(BlinkenFormatService);
      const gen = TestBed.inject(ShowGeneratorService);
      const render = TestBed.inject(RenderService);
      const size = { width: 18, height: 8 };
      // a movie made of plain pixel frames, like an imported BLM file
      const frames = gen.scrollText('Hallo Berlin! ♥', size, { stepDuration: 90 });
      const blm = ['# BlinkenLights Movie 18x8', ...frames.flatMap(f => [
        `@${f.duration}`,
        ...render.renderFrame(f, size, () => undefined).pixels.map(r => r.map(p => (p.active ? '1' : '0')).join('')),
      ])].join('\n');
      const chars = await length(formats.parseBlm(blm));
      console.info(`link for a ${frames.length}-frame 18×8 pixel movie: ${chars} characters`);
      expect(chars).toBeGreaterThan(0);
    });
  });

  it('rejects broken or foreign links with a readable error', async () => {
    await expect(share.readFragment('#nonsense')).rejects.toBeInstanceOf(InvalidFileError);
    await expect(share.readFragment('#b2.@@@')).rejects.toBeInstanceOf(InvalidFileError);
    await expect(share.readFragment('#b2.AAAA')).rejects.toBeInstanceOf(InvalidFileError);
    await expect(share.readFragment('#b1.AAAA')).rejects.toBeInstanceOf(InvalidFileError);
  });
});
