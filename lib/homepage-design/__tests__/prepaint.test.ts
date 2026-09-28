import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  allPalettes, foilPalette, homepageMoods, homepagePalettes, secretMood, surfaceTreatments, wordmarkTracking,
} from '../choices';
import { moodAttributes, moodStyles, prepaintScript, printInk } from '../prepaint';

// Runs the <head> script the way a browser would before first paint.
function prepaint(hash: string, reducedMotion = false) {
  const attributes: Record<string, string> = {};
  const classes = new Set<string>();
  runInNewContext(prepaintScript, {
    location: { hash },
    matchMedia: (query: string) => ({ matches: reducedMotion && query.includes('reduce') }),
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => { attributes[name] = value; },
        classList: { add: (name: string) => classes.add(name) },
      },
    },
  });
  return { attributes, classes };
}

describe('the first paint', () => {
  it('numbers editions exactly like the catalog', () => {
    homepageMoods.forEach((mood, index) => {
      expect(moodAttributes(index + 1)).toEqual(mood.style);
    });
    expect(moodAttributes(217)).toEqual(secretMood.style);
  });

  it('opens a shared edition on its own paper before anything paints', () => {
    for (const number of [1, 2, 147, 216, 217]) {
      const { palette, surface, tracking } = moodAttributes(number);
      expect(prepaint(`#${number}`).attributes).toEqual({
        'data-palette': String(palette), 'data-surface': String(surface), 'data-tracking': String(tracking),
      });
    }
    // Anything else leaves the server-rendered original alone.
    for (const hash of ['', '#0', '#218', '#nope', '#14.7']) {
      expect(prepaint(hash).attributes).toEqual({});
    }
  });

  it('holds the name back for its print pass unless motion is reduced', () => {
    expect(prepaint('').classes.has('intro')).toBe(true);
    expect(prepaint('', true).classes.has('intro')).toBe(false);
  });

  it('styles every palette, paper, and tracking from the same choices', () => {
    allPalettes.forEach((palette, index) => {
      expect(moodStyles).toContain(`:root[data-palette="${index}"]{--homepage-background:${palette.background};`);
    });
    surfaceTreatments.forEach((surface, index) => {
      expect(moodStyles).toContain(`:root[data-surface="${index}"]{--homepage-surface-image:${surface.image};`);
    });
    wordmarkTracking.forEach((tracking, index) => {
      expect(moodStyles).toContain(`:root[data-tracking="${index}"]{--homepage-wordmark-tracking:${tracking.value}}`);
    });
  });

  it('prints dark palettes in their paper color, so white paper still shows the name', () => {
    expect(printInk(homepagePalettes[0])).toBe(homepagePalettes[0].ink);
    expect(printInk(homepagePalettes[1])).toBe(homepagePalettes[1].background);
    expect(printInk(foilPalette)).toBe('#7a5a1c');
    const luminance = (hex: string) => {
      const [r, g, b] = hex.slice(1).match(/../g)!.map((channel) => {
        const value = parseInt(channel, 16) / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      });
      return r * .2126 + g * .7152 + b * .0722;
    };
    for (const palette of allPalettes) {
      // Readable on white paper, fine print included.
      expect(1.05 / (luminance(printInk(palette)) + .05), palette.name).toBeGreaterThanOrEqual(4.5);
    }
  });
});
