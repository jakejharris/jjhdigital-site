import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultHomepageStyle,
  emailTreatments,
  homepagePalettes,
  iconTreatments,
  llcTreatments,
  randomizeHomepageStyle,
  surfaceTreatments,
  wordmarkTracking,
  type HomepageStyleSelection,
} from '../choices';

const axes: Array<{ key: keyof HomepageStyleSelection; length: number }> = [
  { key: 'palette', length: homepagePalettes.length },
  { key: 'email', length: emailTreatments.length },
  { key: 'llc', length: llcTreatments.length },
  { key: 'icon', length: iconTreatments.length },
  { key: 'tracking', length: wordmarkTracking.length },
  { key: 'surface', length: surfaceTreatments.length },
];

const noneIcon = iconTreatments.indexOf('None');

function every<T>(count: number, make: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => make(index));
}

describe('randomizeHomepageStyle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never returns the current index on any axis', () => {
    let current = defaultHomepageStyle;
    for (let round = 0; round < 500; round += 1) {
      const next = randomizeHomepageStyle(current);
      for (const axis of axes) {
        expect(next[axis.key], `${axis.key} repeated on round ${round}`).not.toBe(current[axis.key]);
      }
      current = next;
    }
  });

  it('keeps every index inside its axis', () => {
    let current = defaultHomepageStyle;
    for (let round = 0; round < 500; round += 1) {
      current = randomizeHomepageStyle(current);
      for (const axis of axes) {
        expect(Number.isInteger(current[axis.key])).toBe(true);
        expect(current[axis.key]).toBeGreaterThanOrEqual(0);
        expect(current[axis.key]).toBeLessThan(axis.length);
      }
    }
  });

  it('never rolls the None icon, from any starting icon', () => {
    for (let start = 0; start < iconTreatments.length; start += 1) {
      const rolled = every(300, () =>
        randomizeHomepageStyle({ ...defaultHomepageStyle, icon: start }).icon
      );
      expect(rolled).not.toContain(noneIcon);
      if (start !== noneIcon) expect(rolled).not.toContain(start);
    }
  });


  it('can reach every other index on an axis', () => {
    for (const axis of axes) {
      if (axis.key === 'icon') continue;
      const seen = new Set(
        every(2000, () => randomizeHomepageStyle(defaultHomepageStyle)[axis.key])
      );
      for (let index = 0; index < axis.length; index += 1) {
        if (index === defaultHomepageStyle[axis.key]) continue;
        expect(seen.has(index), `${axis.key} never reached ${index}`).toBe(true);
      }
    }
  });

  it('wraps at the extremes of the random range without landing on the current index', () => {
    const start = { palette: 2, email: 1, llc: 4, icon: 0, tracking: 3, surface: 2 };

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const low = randomizeHomepageStyle(start);
    for (const axis of axes) expect(low[axis.key]).not.toBe(start[axis.key]);

    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const high = randomizeHomepageStyle(start);
    for (const axis of axes) {
      expect(high[axis.key]).not.toBe(start[axis.key]);
      expect(high[axis.key]).toBeLessThan(axis.length);
    }
    expect(high.icon).not.toBe(noneIcon);
  });

  it('does not mutate the current selection', () => {
    const current = { ...defaultHomepageStyle };
    randomizeHomepageStyle(current);
    expect(current).toEqual(defaultHomepageStyle);
  });
});
