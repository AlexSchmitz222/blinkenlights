import { Injectable, inject } from '@angular/core';
import { Show } from '../interfaces/show.interface';
import { Frame } from '../interfaces/frame.interface';
import { Size } from '../interfaces/grid.interface';
import { RenderService, ShapeResolver } from './render.service';
import { InvalidFileError } from '../errors/InvalidFile.error';
import { createId } from '../utils/id';

export type MovieFormat = 'blm' | 'bml';

/**
 * The file formats of the original Blinkenlights project:
 *
 * - **BLM** (Blinkenlights Movie), plain text:
 *   ```
 *   # BlinkenLights Movie 18x8
 *   # name = Hello
 *   @100
 *   000000000000000000
 *   … (one line per row, 1 = lit)
 *   ```
 * - **BML** (Blinkenlights Markup Language), XML:
 *   `<blm width="18" height="8" bits="1" channels="1"><header><title>…</title></header>`
 *   `<frame duration="100"><row>0101…</row>…</frame></blm>`. With `bits` > 1 every pixel is
 *   one or two hex digits per channel; anything at half brightness or more counts as lit.
 *
 * Imported movies become a show with one scene whose frames each hold a single full-grid bitmap.
 */
@Injectable({
  providedIn: 'root'
})
export class BlinkenFormatService {
  private render = inject(RenderService);

  /** Guesses the format from the content (not the file name). */
  detect(content: string): MovieFormat | null {
    const start = content.trimStart().slice(0, 200).toLowerCase();
    if (start.startsWith('# blinkenlights movie') || /^#[^\n]*\n\s*@\d+/.test(start)) return 'blm';
    if (start.startsWith('<?xml') && start.includes('<blm') || start.startsWith('<blm')) return 'bml';
    return null;
  }

  parse(content: string, fileName = 'Imported movie'): Show {
    const format = this.detect(content);
    if (format === 'blm') return this.parseBlm(content, fileName);
    if (format === 'bml') return this.parseBml(content, fileName);
    throw new InvalidFileError('This is not a Blinkenlights movie (BLM/BML).');
  }

  // --- BLM -----------------------------------------------------------------------------------

  parseBlm(content: string, fileName = 'Imported movie'): Show {
    const lines = content.split(/\r?\n/);
    let size: Size | null = null;
    const meta: Record<string, string> = {};
    const frames: { duration: number; rows: string[] }[] = [];
    let current: { duration: number; rows: string[] } | null = null;

    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith('#')) {
        const header = line.match(/blinkenlights movie\s+(\d+)\s*x\s*(\d+)/i);
        if (header) size = { width: +header[1], height: +header[2] };
        const kv = line.slice(1).match(/^\s*([a-z]+)\s*[=:]\s*(.+)$/i);
        if (kv) meta[kv[1].toLowerCase()] = kv[2].trim();
        continue;
      }
      if (line.startsWith('@')) {
        current = { duration: parseInt(line.slice(1), 10) || 0, rows: [] };
        frames.push(current);
        continue;
      }
      if (line && current) {
        if (!/^[01]+$/.test(line)) throw new InvalidFileError(`Unexpected characters in a BLM frame: "${line.slice(0, 20)}"`);
        current.rows.push(line);
      }
    }

    if (frames.length === 0) throw new InvalidFileError('The movie has no frames.');
    size ??= { width: Math.max(...frames.flatMap(f => f.rows.map(r => r.length))), height: Math.max(...frames.map(f => f.rows.length)) };
    return this.toShow(frames, size, meta['name'] ?? meta['title'] ?? baseName(fileName), meta['description'] ?? '', false);
  }

  toBlm(show: Show, resolveShape: ShapeResolver): string {
    const { width, height } = show.size;
    const out = [`# BlinkenLights Movie ${width}x${height}`, `# name = ${oneLine(show.name)}`];
    if (show.description) out.push(`# description = ${oneLine(show.description)}`);
    out.push('# creator = Blinkenlights web editor', '');
    for (const frame of this.frames(show)) {
      out.push(`@${frame.duration}`, ...this.rows(frame, show.size, resolveShape), '');
    }
    return out.join('\n');
  }

  // --- BML -----------------------------------------------------------------------------------

  parseBml(content: string, fileName = 'Imported movie'): Show {
    const doc = new DOMParser().parseFromString(content, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new InvalidFileError('The BML file is not valid XML.');
    const root = doc.documentElement;
    if (root.nodeName.toLowerCase() !== 'blm') throw new InvalidFileError('The BML file has no <blm> element.');

    const width = parseInt(root.getAttribute('width') ?? '', 10);
    const height = parseInt(root.getAttribute('height') ?? '', 10);
    const bits = parseInt(root.getAttribute('bits') ?? '1', 10) || 1;
    const channels = parseInt(root.getAttribute('channels') ?? '1', 10) || 1;
    if (!(width > 0 && height > 0)) throw new InvalidFileError('The BML file has no valid width/height.');
    if (bits < 1 || bits > 8) throw new InvalidFileError(`Unsupported bit depth: ${bits}.`);

    const text = (tag: string) => root.getElementsByTagName('header')[0]?.getElementsByTagName(tag)[0]?.textContent?.trim();
    const loop = /^(yes|true|1)$/i.test(text('loop') ?? '');

    // 1 bit: one character per channel; more bits: one or two hex digits per channel
    const digits = bits === 1 ? 1 : Math.ceil(bits / 4);
    const max = 2 ** bits - 1;
    const frames = [...root.getElementsByTagName('frame')].map(frameEl => ({
      duration: parseInt(frameEl.getAttribute('duration') ?? '0', 10) || 0,
      rows: [...frameEl.getElementsByTagName('row')].map(rowEl => {
        const row = (rowEl.textContent ?? '').trim();
        let out = '';
        for (let px = 0; px < width; px++) {
          let sum = 0;
          for (let c = 0; c < channels; c++) {
            const start = (px * channels + c) * digits;
            sum += parseInt(row.slice(start, start + digits) || '0', bits === 1 ? 2 : 16) || 0;
          }
          out += sum / channels >= max / 2 ? '1' : '0';
        }
        return out;
      }),
    }));
    if (frames.length === 0) throw new InvalidFileError('The movie has no frames.');
    return this.toShow(frames, { width, height }, text('title') || baseName(fileName), text('description') ?? '', loop);
  }

  toBml(show: Show, resolveShape: ShapeResolver): string {
    const { width, height } = show.size;
    const out = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<blm width="${width}" height="${height}" bits="1" channels="1">`,
      '  <header>',
      `    <title>${xml(show.name)}</title>`,
      `    <description>${xml(show.description)}</description>`,
      '    <creator>Blinkenlights web editor</creator>',
      `    <loop>${show.loop ? 'yes' : 'no'}</loop>`,
      '  </header>',
    ];
    for (const frame of this.frames(show)) {
      out.push(`  <frame duration="${frame.duration}">`);
      for (const row of this.rows(frame, show.size, resolveShape)) out.push(`    <row>${row}</row>`);
      out.push('  </frame>');
    }
    out.push('</blm>', '');
    return out.join('\n');
  }

  // --- helpers -------------------------------------------------------------------------------

  private frames(show: Show): Frame[] {
    return show.scenes.flatMap(scene => scene.frames);
  }

  private rows(frame: Frame, size: Size, resolveShape: ShapeResolver): string[] {
    return this.render.renderFrame(frame, size, resolveShape).pixels.map(row => row.map(p => (p.active === true ? '1' : '0')).join(''));
  }

  private toShow(frames: { duration: number; rows: string[] }[], size: Size, name: string, description: string, loop: boolean): Show {
    const normalize = (rows: string[]) =>
      Array.from({ length: size.height }, (_, y) => (rows[y] ?? '').padEnd(size.width, '0').slice(0, size.width));
    return {
      id: createId('show'),
      name,
      description,
      size,
      loop,
      scenes: [{
        id: createId('scene'),
        name: 'Movie',
        frames: frames.map(f => ({
          id: createId('frame'),
          duration: f.duration,
          objects: [{ id: 'movie', type: 'bitmap', position: { x: 0, y: 0 }, size: { ...size }, rows: normalize(f.rows) }],
        })),
      }],
    };
  }
}

function baseName(fileName: string): string {
  return fileName.replace(/\.(blm|bml|xml|txt)$/i, '') || 'Imported movie';
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function xml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
