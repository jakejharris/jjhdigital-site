import { describe, expect, it } from 'vitest';
import {
  hilbertIndex, morphLength, pairGlyph, particleAt, planArrival, planMorph, sampleCells, type Cell,
} from '../pixel-type';

// An RGBA region with alpha set wherever paint(x, y) is true.
function region(width: number, height: number, paint: (x: number, y: number) => number) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) rgba[(y * width + x) * 4 + 3] = Math.round(paint(x, y) * 255);
  }
  return rgba;
}
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('sampling type into pixels', () => {
  it('turns a painted block into grid cells anchored to the canvas origin', () => {
    // A 12 × 8 block painted at canvas position (10, 20) on a 4 px grid.
    const cells = sampleCells(region(12, 8, () => 1), 12, 8, 10, 20, 4);
    const xs = [...new Set(cells.map((c) => c.x))].sort((a, b) => a - b);
    const ys = [...new Set(cells.map((c) => c.y))].sort((a, b) => a - b);
    // Cells at 8–12 and 20–24 are half covered by the block and stay in.
    expect(xs).toEqual([10, 14, 18, 22]);
    expect(ys).toEqual([22, 26]);
    expect(cells.every((c) => c.size === 4 && (c.x - 2) % 4 === 0 && (c.y - 2) % 4 === 0)).toBe(true);
  });

  it('keeps marks covering at least a fifth of a cell and drops fainter ones', () => {
    // One pixel wide line through 4 px cells covers a quarter of each cell.
    const hairline = region(8, 8, (x) => (x === 1 ? 1 : 0));
    expect(sampleCells(hairline, 8, 8, 0, 0, 4, 0.2)).toHaveLength(2);
    expect(sampleCells(hairline, 8, 8, 0, 0, 4, 0.3)).toHaveLength(0);
    expect(sampleCells(region(8, 8, () => 0), 8, 8, 0, 0, 4, 0.2)).toEqual([]);
  });
});

describe('pairing two faces', () => {
  it('walks a Hilbert curve that visits every cell once, one step at a time', () => {
    const n = 16;
    const order: Array<[number, number]> = [];
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) order[hilbertIndex(x, y, n)] = [x, y];
    expect(order.filter(Boolean)).toHaveLength(n * n);
    for (let i = 1; i < order.length; i++) {
      const [ax, ay] = order[i - 1];
      const [bx, by] = order[i];
      expect(Math.abs(ax - bx) + Math.abs(ay - by)).toBe(1);
    }
  });

  it('gives every pixel of both letters a partner', () => {
    const grid = (count: number, size: number): Cell[] =>
      Array.from({ length: count }, (_, i) => ({ x: (i % 5) * size, y: Math.floor(i / 5) * size, size }));
    for (const [a, b] of [[7, 19], [19, 7], [12, 12]]) {
      const from = grid(a, 4);
      const to = grid(b, 6);
      const pairs = pairGlyph(from, to);
      expect(pairs).toHaveLength(Math.max(a, b));
      expect(new Set(pairs.map(([start]) => start)).size).toBe(a);
      expect(new Set(pairs.map(([, end]) => end)).size).toBe(b);
    }
    // A letter with nothing to start from grows in place; one with nowhere to go shrinks away.
    const cells = grid(3, 4);
    expect(pairGlyph([], cells).map(([start, end]) => [start.size, end.size, start.x === end.x])).toEqual(
      cells.map(() => [0, 4, true]));
    expect(pairGlyph(cells, []).every(([start, end]) => end.size === 0 && end.x === start.x)).toBe(true);
    expect(pairGlyph([], [])).toEqual([]);
  });
});

describe('moving the pixels', () => {
  const from: Cell[][] = [
    [{ x: 10, y: 10, size: 4 }, { x: 14, y: 10, size: 4 }],
    [{ x: 40, y: 10, size: 4 }],
  ];
  const to: Cell[][] = [
    [{ x: 12, y: 30, size: 6 }],
    [{ x: 44, y: 30, size: 6 }, { x: 50, y: 30, size: 6 }, { x: 44, y: 36, size: 6 }],
  ];

  it('starts on the old letters, ends exactly on the new ones, and sweeps left to right', () => {
    const particles = planMorph(from, to, seeded());
    expect(particles).toHaveLength(2 + 3);
    const end = morphLength(particles);
    for (const particle of particles) {
      expect(particleAt(particle, 0)).toEqual(particle.from);
      expect(particleAt(particle, end)).toEqual(particle.to);
    }
    expect(particles.map((p) => p.glyph)).toEqual([0, 0, 1, 1, 1]);
    const starts = (glyph: number) => particles.filter((p) => p.glyph === glyph).map((p) => p.delay);
    expect(Math.min(...starts(1))).toBeGreaterThan(Math.min(...starts(0)));
  });

  it('lifts a letter mid-move and lands it on the grid', () => {
    const particle = {
      from: { x: 0, y: 0, size: 4 }, to: { x: 0, y: 100, size: 8 },
      glyph: 0, delay: 20, duration: 100, hop: 10, swell: 0, angle: 0,
    };
    expect(particleAt(particle, 0)).toEqual(particle.from);
    expect(particleAt(particle, 70)).toEqual({ x: 0, y: 40, size: 6 });
    expect(particleAt(particle, 500)).toEqual(particle.to);
  });

  it('prints the name on arrival: each pixel drops onto its place, in reading order', () => {
    const particles = planArrival(to, seeded());
    expect(particles).toHaveLength(4);
    const end = morphLength(particles);
    for (const particle of particles) {
      expect(particle.from.x).toBe(particle.to.x);
      expect(particle.from.y).toBeLessThan(particle.to.y);
      expect(particleAt(particle, 0).size).toBe(0);
      expect(particleAt(particle, end)).toEqual(particle.to);
    }
    const starts = (glyph: number) => particles.filter((p) => p.glyph === glyph).map((p) => p.delay);
    expect(Math.min(...starts(1))).toBeGreaterThan(Math.max(...starts(0)));
    expect(morphLength([])).toBe(0);
  });
});
