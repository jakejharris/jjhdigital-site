import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultFontName, fontFamily, isLikedFontName, likedFonts } from '../wordmark-shared';

it('every public shuffle face has a bundled font and redistribution license', () => {
  for (const font of likedFonts) {
    if (font.name === defaultFontName) continue;
    const slug = font.name.toLowerCase().replaceAll(' ', '-');
    expect(existsSync(`public/fonts/${slug}-wordmark.woff2`)).toBe(true);
    expect(readFileSync(`public/fonts/${slug}-wordmark.woff2`).subarray(0, 4).toString('ascii')).toBe('wOF2');
    expect(readFileSync(`public/fonts/${slug}-OFL.txt`, 'utf8')).toContain('SIL OPEN FONT LICENSE');
  }
  expect(isLikedFontName(defaultFontName)).toBe(true);
  expect(isLikedFontName('a lab-only font')).toBe(false);
});

describe('fontFamily', () => {
  it('quotes the family and picks a generic fallback by category', () => {
    expect(fontFamily({ name: 'Work Sans', category: 'Sans' })).toBe('"Work Sans", sans-serif');
    expect(fontFamily({ name: 'JetBrains Mono', category: 'Mono' })).toBe('"JetBrains Mono", monospace');
    expect(fontFamily({ name: 'Gloock', category: 'Serif' })).toBe('"Gloock", serif');
    expect(fontFamily({ name: 'Monoton', category: 'Display' })).toBe('"Monoton", serif');
  });
});
