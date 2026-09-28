import { describe, expect, it } from 'vitest';
import {
  allPalettes, defaultHomepageStyle, describeMood, foilPalette, homepageMoods, homepagePalettes,
  homepageTypefaces, moodForNumber, moodNumber, moodNumberFromHash, nextHomepageMood,
  sameMood, secretMood, secretNumber, surfaceTreatments,
} from '../choices';

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

describe('216 numbered moods and one more', () => {
  it('offers 216 distinct combinations, numbered from the original letterhead', () => {
    expect(homepageMoods).toHaveLength(216);
    expect(new Set(homepageMoods.map((mood) => JSON.stringify(mood))).size).toBe(216);
    expect(homepageMoods[0]).toEqual({ fontName: 'Cormorant Garamond', style: defaultHomepageStyle });
    for (const face of homepageTypefaces) {
      const moods = homepageMoods.filter((mood) => mood.fontName === face.fontName);
      expect(moods).toHaveLength(homepagePalettes.length * surfaceTreatments.length);
      expect(moods.every((mood) => mood.style.tracking === face.tracking)).toBe(true);
    }
    expect(new Set(surfaceTreatments.map((surface) => surface.image)).size).toBe(surfaceTreatments.length);
  });

  it('numbers every mood once, and the foil edition is No. 217', () => {
    for (let number = 1; number <= 216; number++) {
      expect(moodNumber(moodForNumber(number)!)).toBe(number);
    }
    expect(secretNumber).toBe(217);
    expect(moodForNumber(217)).toBe(secretMood);
    expect(moodNumber(secretMood)).toBe(217);
    expect(homepageMoods.some((mood) => sameMood(mood, secretMood))).toBe(false);
    expect(allPalettes[secretMood.style.palette]).toBe(foilPalette);
    for (const outside of [0, 218, 1.5, -1, NaN]) expect(moodForNumber(outside)).toBeUndefined();
    expect(moodNumber({ fontName: 'a lab font', style: defaultHomepageStyle })).toBeUndefined();
  });

  it('reads a shared edition from the address', () => {
    expect(moodNumberFromHash('#147')).toBe(147);
    expect(moodNumberFromHash('#217')).toBe(217);
    expect(moodNumberFromHash('12')).toBe(12);
    for (const hash of ['', '#', '#0', '#218', '#1000', '#abc', '#14.7', '#-3', '# 1']) {
      expect(moodNumberFromHash(hash)).toBeUndefined();
    }
  });

  it('names each mood the way the colophon prints it', () => {
    expect(describeMood(homepageMoods[0])).toBe('Cormorant Garamond on Ivory paper');
    expect(describeMood(moodForNumber(147)!)).toBe('Gloock on Coral paper');
    expect(describeMood(moodForNumber(11)!)).toBe('Monoton on Ivory drafting paper');
    expect(describeMood(moodForNumber(18)!)).toBe('Bebas Neue on Ivory dot paper');
  });
});

describe('the deck', () => {
  it('never repeats a mood until all 216 are seen, then deals the foil edition, then starts over', () => {
    let mood = homepageMoods[0];
    let seen = new Set([1]);
    for (let draw = 2; draw <= 216; draw++) {
      mood = nextHomepageMood(mood, seen, () => 0);
      const number = moodNumber(mood)!;
      expect(seen.has(number)).toBe(false);
      seen.add(number);
    }
    expect(seen.size).toBe(216);
    mood = nextHomepageMood(mood, seen, () => .5);
    expect(mood).toBe(secretMood);

    // The page clears what it has seen once the foil edition shows.
    seen = new Set();
    const after = nextHomepageMood(mood, seen, () => .99);
    expect(moodNumber(after)).toBeLessThanOrEqual(216);
  });

  it('gives every unseen mood equal odds and never draws the current one', () => {
    const current = moodForNumber(100)!;
    const seen = new Set([100, 3, 50, 150, 216]);
    const unseen = 216 - seen.size;
    const draws = Array.from({ length: unseen }, (_, n) =>
      moodNumber(nextHomepageMood(current, seen, () => (n + .5) / unseen))!);
    expect(new Set(draws).size).toBe(unseen);
    expect(draws.some((number) => seen.has(number))).toBe(false);
    // A random source of 0 always deals the next edition in number order.
    expect(moodNumber(nextHomepageMood(current, seen, () => 0))).toBe(101);
    expect(moodNumber(nextHomepageMood(moodForNumber(216)!, new Set([216]), () => 0))).toBe(1);
  });

  it('starts from the list after a lab font or the foil edition', () => {
    const lab = { fontName: 'a lab font', style: defaultHomepageStyle };
    expect(nextHomepageMood(lab, new Set(), () => 0)).toBe(homepageMoods[0]);
    expect(nextHomepageMood(lab, new Set(), () => .999999)).toBe(homepageMoods.at(-1));
    expect(moodNumber(nextHomepageMood(secretMood, new Set(), () => 0))).toBe(1);
  });
});

describe('contrast', () => {
  it('keeps readable inks above AA on plain paper and intersecting grid lines, foil included', () => {
    for (const palette of allPalettes) {
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

  it('keeps the darkest stop of the foil gradient readable as display type', () => {
    // The foil name is large display text, so 3:1 is the bar for its darkest stop.
    expect(contrast('#b8862c', foilPalette.background)).toBeGreaterThanOrEqual(3);
  });
});
