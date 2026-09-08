import { describe, expect, it } from 'vitest';
import { homepageMoods, homepagePalettes, nextHomepageMood } from '../choices';

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

describe('complete moods', () => {
  it('can draw every other mood, and never repeats the current one', () => {
    for (const current of homepageMoods) {
      const draws = Array.from({ length: homepageMoods.length - 1 }, (_, n) =>
        nextHomepageMood(current.fontName, () => n / (homepageMoods.length - 1))
      );
      expect(new Set(draws).size).toBe(homepageMoods.length - 1);
      expect(draws).not.toContain(current);
      expect(draws.every((mood) => homepageMoods.includes(mood))).toBe(true);
    }
  });

  it('returns to the original letterhead, including after lab browsing', () => {
    const last = homepageMoods.at(-1)!;
    expect(nextHomepageMood(last.fontName, () => 0)).toBe(homepageMoods[0]);
    expect(nextHomepageMood('a lab font', () => 0)).toBe(homepageMoods[0]);
    expect(nextHomepageMood('a lab font', () => .999999)).toBe(last);
  });

  it('keeps all readable inks and contact hover states above AA contrast', () => {
    for (const palette of homepagePalettes) {
      for (const ink of ['ink', 'body', 'accent'] as const) {
        expect(contrast(palette[ink], palette.background), `${palette.name}: ${ink}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
