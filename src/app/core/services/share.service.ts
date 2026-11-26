import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Show } from '../interfaces/show.interface';
import { ShowFile, ShowFileService } from './show-file.service';
import { InvalidFileError } from '../errors/InvalidFile.error';

/** Links longer than this may get cut off by some messengers and mail programs. */
export const LONG_LINK = 8000;

/** Version prefix of the link data, so the format can change later without breaking old links. */
const PREFIX = 'b1.';

/**
 * Share links that contain the whole show (with its shapes), compressed, in the URL fragment:
 * `https://…/share#b1.<data>`. The fragment is never sent to a server, so no backend is needed and
 * a shared show stays between the people who have the link.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private files = inject(ShowFileService);
  private document = inject(DOCUMENT);

  /** Builds the link for a show (as currently edited, saved or not). */
  async createLink(show: Show): Promise<string> {
    const file = this.files.createShowFile(show);
    const data = await encode(JSON.stringify(file));
    return new URL(`share#${PREFIX}${data}`, this.document.baseURI).href;
  }

  /** Reads the show from a link's fragment (with or without the leading '#'). */
  async readFragment(fragment: string): Promise<ShowFile> {
    const raw = fragment.replace(/^#/, '');
    if (!raw.startsWith(PREFIX)) throw new InvalidFileError('share.invalidLink');
    let json: string;
    try {
      json = await decode(raw.slice(PREFIX.length));
    } catch {
      throw new InvalidFileError('share.invalidLink');
    }
    const file = this.files.parse(json);
    if (file.format !== 'blinkenlights-show') throw new InvalidFileError('share.invalidLink');
    return file;
  }
}

async function encode(text: string): Promise<string> {
  const compressed = await pipe(new TextEncoder().encode(text), new CompressionStream('deflate-raw'));
  return toBase64Url(compressed);
}

async function decode(data: string): Promise<string> {
  const decompressed = await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw'));
  return new TextDecoder().decode(decompressed);
}

async function pipe(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const reader = source.pipeThrough(transform as unknown as TransformStream<Uint8Array, Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.length;
  }
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Base64 with URL-safe characters and no padding. */
function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(data)) throw new Error('not base64url');
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (data.length % 4)) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
