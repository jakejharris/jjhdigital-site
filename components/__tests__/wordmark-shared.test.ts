import { describe, expect, it } from 'vitest';
import { likedFontNames } from '../font-lab-catalog';
import {
  defaultFontName,
  fontFamily,
  isLikedFontName,
  likedFonts,
  nextLikedFontName,
} from '../wordmark-shared';

describe('nextLikedFontName', () => {
  it('always returns a liked font and never repeats the current one', () => {
    for (const current of likedFontNames) {
      for (let round = 0; round < 200; round += 1) {
        const next = nextLikedFontName(current);
        expect(isLikedFontName(next)).toBe(true);
        expect(next).not.toBe(current);
      }
    }
  });

  it('moves from a non-liked font (the default, or lab browsing) to any liked font', () => {
    const seen = new Set<string>();
    for (let round = 0; round < 500; round += 1) {
      const next = nextLikedFontName(defaultFontName);
      expect(isLikedFontName(next)).toBe(true);
      seen.add(next);
    }
    expect([...seen].sort()).toEqual([...likedFontNames].sort());
  });

  it('wraps around the liked list at both ends of the random range', () => {
    const last = likedFontNames[likedFontNames.length - 1];
    expect(nextLikedFontName(last, () => 0)).toBe(likedFontNames[0]);
    expect(nextLikedFontName(likedFontNames[0], () => 0.999999)).toBe(last);
  });

  it('resolves every liked name to a catalog entry', () => {
    expect(likedFonts.map((font) => font.name)).toEqual([...likedFontNames]);
    for (const font of likedFonts) expect(font.category).toBeTruthy();
  });
});

describe('fontFamily', () => {
  it('quotes the family and picks a generic fallback by category', () => {
    expect(fontFamily({ name: 'Work Sans', category: 'Sans' })).toBe('"Work Sans", sans-serif');
    expect(fontFamily({ name: 'JetBrains Mono', category: 'Mono' })).toBe('"JetBrains Mono", monospace');
    expect(fontFamily({ name: 'Gloock', category: 'Serif' })).toBe('"Gloock", serif');
    expect(fontFamily({ name: 'Monoton', category: 'Display' })).toBe('"Monoton", serif');
  });
});
