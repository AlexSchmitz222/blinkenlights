import { fitImageSize, imageToPattern, RgbaImage } from './image-to-pattern';

/** Builds an RGBA image from rows of characters: '#' black, '.' white, ' ' transparent. */
function image(rows: string[]): RgbaImage {
  const data: number[] = [];
  for (const row of rows) {
    for (const c of row) {
      if (c === '#') data.push(0, 0, 0, 255);
      else if (c === '.') data.push(255, 255, 255, 255);
      else data.push(0, 0, 0, 0);
    }
  }
  return { width: rows[0].length, height: rows.length, data };
}

const lit = (rows: string[], invert = false, threshold = 128) =>
  imageToPattern(image(rows), { threshold, invert }).map(p => `${p.position.x},${p.position.y}`);

describe('imageToPattern', () => {
  it('lights up dark pixels by default', () => {
    expect(lit(['#.', '.#'])).toEqual(['0,0', '1,1']);
  });

  it('lights up bright pixels when inverted', () => {
    expect(lit(['#.', '.#'], true)).toEqual(['1,0', '0,1']);
  });

  it('keeps transparent pixels off either way', () => {
    expect(lit(['# '])).toEqual(['0,0']);
    expect(lit(['. '], true)).toEqual(['0,0']);
  });

  it('respects the threshold', () => {
    const gray = { width: 1, height: 1, data: [100, 100, 100, 255] };
    expect(imageToPattern(gray, { threshold: 128, invert: false }).length).toBe(1);
    expect(imageToPattern(gray, { threshold: 90, invert: false }).length).toBe(0);
  });
});

describe('fitImageSize', () => {
  const max = { width: 39, height: 21 };

  it('scales big images down to fit, keeping the aspect ratio', () => {
    expect(fitImageSize({ width: 400, height: 200 }, max)).toEqual({ width: 39, height: 20 });
    expect(fitImageSize({ width: 100, height: 100 }, max)).toEqual({ width: 21, height: 21 });
  });

  it('does not scale small images up', () => {
    expect(fitImageSize({ width: 8, height: 6 }, max)).toEqual({ width: 8, height: 6 });
  });

  it('derives the height from a chosen width and shrinks the width if the height would not fit', () => {
    expect(fitImageSize({ width: 100, height: 50 }, max, 10)).toEqual({ width: 10, height: 5 });
    expect(fitImageSize({ width: 100, height: 100 }, max, 39)).toEqual({ width: 21, height: 21 });
    expect(fitImageSize({ width: 100, height: 100 }, max, 0)).toEqual({ width: 1, height: 1 });
  });
});
