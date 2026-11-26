import { Injectable, inject } from '@angular/core';
import { Grid, Size } from '../interfaces/grid.interface';
import { Character } from '../interfaces/character.interface';
import { Shape } from '../interfaces/shape.interface';
import { DrawService } from './draw.service';
import { GridService } from './grid.service';
import { FONTS, FontDefinition, FontId, glyphToCharacter } from '../../shapes/characters.shapes';

export interface TextOptions {
  /** Which pixel font. Default 'regular' (5×7); 'small' is 3×5 capitals. */
  font?: FontId;
  /** Empty columns between characters. Default 1. */
  spacing?: number;
  /** Empty rows between lines (on top of the descender row). Default 1. */
  lineSpacing?: number;
  /** Draw a lit box with the letters cut out. */
  inverted?: boolean;
  /** Skip pixels outside the grid instead of throwing (needed for scrolling text). */
  clip?: boolean;
}

interface LoadedFont {
  definition: FontDefinition;
  glyphs: Map<string, Character>;
  fallback: Character;
}

/** Text is drawn with its top-left at (x, y), where y is the cap line of the first line of text. */
@Injectable({
  providedIn: 'root'
})
export class TextDrawService {
  private draw = inject(DrawService);
  private gridService = inject(GridService);

  private readonly fonts: Record<FontId, LoadedFont> = Object.fromEntries(
    Object.values(FONTS).map(def => [
      def.id,
      {
        definition: def,
        glyphs: new Map(Object.entries(def.glyphs).map(([char, rows]) => [char, glyphToCharacter(char, rows, def.capHeight)])),
        fallback: glyphToCharacter('�', def.fallback, def.capHeight),
      },
    ]),
  ) as Record<FontId, LoadedFont>;

  /** Cap height of the regular font (kept for callers that don't care about fonts). */
  readonly capHeight = FONTS.regular.capHeight;
  readonly lineHeight = FONTS.regular.capHeight + FONTS.regular.maxDescent;

  capHeightOf(font: FontId = 'regular'): number {
    return FONTS[font].capHeight;
  }

  lineHeightOf(font: FontId = 'regular'): number {
    return FONTS[font].capHeight + FONTS[font].maxDescent;
  }

  /** The glyph for a character, or a box for unknown characters. */
  getCharacter(char: string, font: FontId = 'regular'): Character {
    const loaded = this.fonts[font];
    return loaded.glyphs.get(char)
      ?? (loaded.definition.uppercaseOnly ? loaded.glyphs.get(char.toUpperCase()) : undefined)
      ?? loaded.fallback;
  }

  hasCharacter(char: string, font: FontId = 'regular'): boolean {
    const loaded = this.fonts[font];
    return loaded.glyphs.has(char) || (loaded.definition.uppercaseOnly && loaded.glyphs.has(char.toUpperCase()));
  }

  /** Size the text occupies. Height includes the descender row so lines never overlap. */
  measureText(text: string, options: TextOptions = {}): Size {
    const lines = this.lines(text);
    const lineSpacing = options.lineSpacing ?? 1;
    const width = Math.max(0, ...lines.map(line => this.measureLine(line, options.spacing ?? 1, options.font)));
    const height = lines.length * this.lineHeightOf(options.font) + (lines.length - 1) * lineSpacing;
    return { width, height };
  }

  drawText(grid: Grid, x: number, y: number, text: string, options: TextOptions = {}) {
    const spacing = options.spacing ?? 1;
    const lineSpacing = options.lineSpacing ?? 1;
    const drawOptions = { clip: options.clip };
    const lineHeight = this.lineHeightOf(options.font);

    if (options.inverted) {
      const size = this.measureText(text, options);
      this.fillBox(grid, x - 1, y - 1, size.width + 2, size.height + 2, options.clip ?? false);
    }

    this.lines(text).forEach((line, index) => {
      let cx = x;
      const cy = y + index * (lineHeight + lineSpacing);
      for (const char of line) {
        const glyph = this.getCharacter(char, options.font);
        if (options.inverted) {
          for (const p of glyph.pattern) {
            this.draw.drawPixel(grid, cx + p.position.x, cy + p.position.y, false, drawOptions);
          }
        } else {
          this.draw.drawShape(grid, cx, cy, glyph, false, drawOptions);
        }
        cx += glyph.size.width + spacing;
      }
    });
  }

  /** Renders text into a standalone shape (e.g. to use it like any other shape). */
  textToShape(text: string, options: TextOptions = {}): Shape {
    const size = this.measureText(text, options);
    const pad = options.inverted ? 1 : 0;
    const grid = this.gridService.generateEmptyGrid('text', { width: size.width + 2 * pad, height: size.height + 2 * pad });
    this.drawText(grid, pad, pad, text, { ...options, clip: true });
    return {
      id: `text:${text}`,
      name: text,
      description: '',
      size: grid.size,
      pattern: grid.pixels.flat().filter(p => p.active).map(p => ({ position: p.position, active: true })),
      inverted: false,
    };
  }

  private measureLine(line: string, spacing: number, font?: FontId): number {
    const chars = [...line];
    if (chars.length === 0) return 0;
    return chars.reduce((sum, char) => sum + this.getCharacter(char, font).size.width, 0) + spacing * (chars.length - 1);
  }

  private lines(text: string): string[] {
    return text.split(/\r?\n/);
  }

  private fillBox(grid: Grid, x: number, y: number, width: number, height: number, clip: boolean) {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        this.draw.drawPixel(grid, x + dx, y + dy, true, { clip });
      }
    }
  }
}
