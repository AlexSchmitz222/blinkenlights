import { TestBed } from '@angular/core/testing';
import { BlinkenFormatService } from './blinken-format.service';
import { InvalidFileError } from '../errors/InvalidFile.error';
import { BitmapObject } from '../interfaces/frame.interface';
import { Show } from '../interfaces/show.interface';

const BLM = `# BlinkenLights Movie 4x3
# name = Tiny test
# description = two frames
@120
1000
0100
0011

@0
1111
0000
1111
`;

const BML = `<?xml version="1.0" encoding="UTF-8"?>
<blm width="3" height="2" bits="4" channels="1">
  <header><title>Gray &amp; test</title><loop>yes</loop></header>
  <frame duration="250">
    <row>f70</row>
    <row>08f</row>
  </frame>
</blm>`;

describe('BlinkenFormatService', () => {
  let formats: BlinkenFormatService;
  const noShapes = () => undefined;
  const rowsOf = (show: Show, frame = 0) => (show.scenes[0].frames[frame].objects[0] as BitmapObject).rows;

  beforeEach(() => {
    formats = TestBed.inject(BlinkenFormatService);
  });

  it('detects formats from content', () => {
    expect(formats.detect(BLM)).toBe('blm');
    expect(formats.detect(BML)).toBe('bml');
    expect(formats.detect('{"format":"blinkenlights-show"}')).toBeNull();
  });

  it('parses BLM size, metadata, durations and pixels', () => {
    const show = formats.parse(BLM, 'tiny.blm');
    expect(show.size).toEqual({ width: 4, height: 3 });
    expect(show.name).toBe('Tiny test');
    expect(show.description).toBe('two frames');
    expect(show.scenes[0].frames.map(f => f.duration)).toEqual([120, 0]);
    expect(rowsOf(show)).toEqual(['1000', '0100', '0011']);
  });

  it('round-trips BLM: import → export gives the same frames', () => {
    const show = formats.parseBlm(BLM);
    const exported = formats.toBlm(show, noShapes);
    const strip = (s: string) => s.split('\n').filter(l => !l.startsWith('#') && l.trim()).join('\n');
    expect(strip(exported)).toBe(strip(BLM));
    expect(exported.startsWith('# BlinkenLights Movie 4x3')).toBe(true);
  });

  it('parses grayscale BML with a half-brightness threshold', () => {
    const show = formats.parse(BML, 'gray.bml');
    expect(show.name).toBe('Gray & test');
    expect(show.loop).toBe(true);
    expect(show.scenes[0].frames[0].duration).toBe(250);
    // f=15 on, 7 < 7.5 off, 0 off / 0 off, 8 on, f on
    expect(rowsOf(show)).toEqual(['100', '011']);
  });

  it('round-trips BML', () => {
    const show = formats.parseBlm(BLM);
    const again = formats.parseBml(formats.toBml(show, noShapes));
    expect(again.size).toEqual(show.size);
    expect(again.scenes[0].frames.map(f => (f.objects[0] as BitmapObject).rows)).toEqual(
      show.scenes[0].frames.map(f => (f.objects[0] as BitmapObject).rows),
    );
  });

  it('renders shapes and text when exporting', () => {
    const show: Show = {
      id: 's', name: 'Text', description: '', size: { width: 3, height: 8 }, loop: false,
      scenes: [{ id: 'sc', name: 'S', frames: [{ id: 'f', duration: 50, objects: [{ id: 't', type: 'text', text: 'I', position: { x: 0, y: 0 } }] }] }],
    };
    const blm = formats.toBlm(show, noShapes);
    expect(blm).toContain('@50\n111\n010');
  });

  it('pads short rows and fills missing rows', () => {
    const show = formats.parseBlm('# BlinkenLights Movie 3x2\n@10\n1\n');
    expect(rowsOf(show)).toEqual(['100', '000']);
  });

  it('rejects broken files', () => {
    expect(() => formats.parse('hello')).toThrowError(InvalidFileError);
    expect(() => formats.parseBlm('# BlinkenLights Movie 2x1\n')).toThrowError(/no frames/);
    expect(() => formats.parseBlm('# BlinkenLights Movie 2x1\n@1\n1x\n')).toThrowError(/Unexpected characters/);
    expect(() => formats.parseBml('<blm width="2"></blm>')).toThrowError(/width\/height/);
  });
});
