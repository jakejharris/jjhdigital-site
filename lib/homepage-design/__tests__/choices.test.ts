import { describe, expect, it } from 'vitest';
import { defaultHomepageStyle, homepageMoods, homepagePalettes, homepageTypefaces, nextHomepageMood, surfaceTreatments } from '../choices';

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
  it('offers 216 distinct combinations with a visible surface for every palette', () => {
    expect(homepageMoods).toHaveLength(216);
    expect(new Set(homepageMoods.map((mood) => JSON.stringify(mood))).size).toBe(216);
    expect(homepageMoods[0]).toEqual({ fontName: 'Cormorant Garamond', style: defaultHomepageStyle });
    for (const face of homepageTypefaces) {
      const moods = homepageMoods.filter((mood) => mood.fontName === face.fontName);
      expect(moods).toHaveLength(homepagePalettes.length * surfaceTreatments.length);
      expect(moods.every((mood) => mood.style.tracking === face.tracking)).toBe(true);
    }
    expect(new Set(surfaceTreatments.map((surface) => surface.image)).size).toBe(surfaceTreatments.length);
    expect(homepagePalettes.map((palette) => palette.grid)).not.toContain('transparent');
  });

  it('can draw every other mood, and never repeats the current one', () => {
    for (const current of homepageMoods) {
      const draws = Array.from({ length: homepageMoods.length - 1 }, (_, n) =>
        nextHomepageMood({ ...current, style: { ...current.style } }, () => (n + .5) / (homepageMoods.length - 1))
      );
      expect(new Set(draws).size).toBe(homepageMoods.length - 1);
      expect(draws).not.toContain(current);
      expect(draws.every((mood) => homepageMoods.includes(mood))).toBe(true);
    }
  });

  it('returns to the original letterhead, including after lab browsing', () => {
    const last = homepageMoods.at(-1)!;
    const lab = { fontName: 'a lab font', style: defaultHomepageStyle };
    expect(nextHomepageMood(last, () => 0)).toBe(homepageMoods[0]);
    expect(nextHomepageMood(lab, () => 0)).toBe(homepageMoods[0]);
    expect(nextHomepageMood(lab, () => .999999)).toBe(last);
  });

  it('keeps readable inks above AA contrast on plain paper and intersecting grid lines', () => {
    for (const palette of homepagePalettes) {
      const [r, g, b, opacity] = palette.grid.match(/[\d.]+/g)!.map(Number);
      // Two grid strokes overlap at intersections; dots only draw one layer.
      const alpha = 1 - (1 - opacity) ** 2;
      const background = palette.background.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16));
      const intersection = '#' + [r, g, b].map((channel, index) =>
        Math.round(channel * alpha + background[index] * (1 - alpha)).toString(16).padStart(2, '0')
      ).join('');
      for (const paper of [palette.background, intersection]) {
        for (const ink of ['ink', 'body', 'accent'] as const) {
          expect(contrast(palette[ink], paper), `${palette.name}: ${ink} on ${paper}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
