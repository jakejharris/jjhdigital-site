// Pure math for re-setting type as pixels: sample a glyph into grid cells,
// pair the cells of one face with the cells of the next, and place every
// pixel at a moment of the move. The browser code draws what this computes.

export type Cell = { x: number; y: number; size: number };
export type Particle = {
  from: Cell;
  to: Cell;
  // Which letter of the name the pixel belongs to, in reading order.
  glyph: number;
  delay: number;
  duration: number;
  // Letters hop as one piece while their pixels rearrange, and swell a
  // little from their own middle, so each letter stays a letter in flight.
  hop: number;
  swell: number;
  angle: number;
};

// Reads the alpha channel of an RGBA region whose top-left corner sits at
// (left, top) on the canvas. The grid is anchored to the canvas origin, so
// pixels of one size line up across every letter.
export function sampleCells(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  left: number,
  top: number,
  cell: number,
  threshold = 0.3,
): Cell[] {
  const cells: Cell[] = [];
  const firstX = Math.floor(left / cell) * cell;
  const firstY = Math.floor(top / cell) * cell;
  for (let gy = firstY; gy < top + height; gy += cell) {
    for (let gx = firstX; gx < left + width; gx += cell) {
      let covered = 0;
      let samples = 0;
      const x0 = Math.max(0, Math.floor(gx - left));
      const y0 = Math.max(0, Math.floor(gy - top));
      const x1 = Math.min(width, Math.ceil(gx + cell - left));
      const y1 = Math.min(height, Math.ceil(gy + cell - top));
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          covered += rgba[(y * width + x) * 4 + 3];
          samples += 1;
        }
      }
      // Cells cut off by the region edge count as empty where they are missing.
      const area = cell * cell;
      if (samples && covered / 255 / area >= threshold) {
        cells.push({ x: gx + cell / 2, y: gy + cell / 2, size: cell });
      }
    }
  }
  return cells;
}

// Position along a Hilbert curve over an n × n grid (n a power of two).
// Neighbours on the curve are neighbours on the page, so pairing two glyphs
// along it keeps each part of a letter moving with its surroundings.
export function hilbertIndex(x: number, y: number, n: number) {
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0;
    const ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) {
        x = n - 1 - x;
        y = n - 1 - y;
      }
      [x, y] = [y, x];
    }
  }
  return d;
}

function curveOrder(cells: Cell[]) {
  if (cells.length < 2) return cells;
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const n = 64;
  const key = (c: Cell) => hilbertIndex(
    Math.min(n - 1, Math.floor((c.x - minX) / span * (n - 1))),
    Math.min(n - 1, Math.floor((c.y - minY) / span * (n - 1))),
    n,
  );
  return cells.map((c) => ({ c, k: key(c) })).sort((a, b) => a.k - b.k).map(({ c }) => c);
}

// Every source cell and every target cell gets at least one particle. When a
// face has more pixels than the last, sources split; when it has fewer, they
// merge. A glyph with nothing to start from grows out of its own pixels.
export function pairGlyph(from: Cell[], to: Cell[]): Array<[Cell, Cell]> {
  const a = curveOrder(from);
  const b = curveOrder(to);
  if (!a.length && !b.length) return [];
  if (!a.length) return b.map((cell) => [{ ...cell, size: 0 }, cell]);
  if (!b.length) return a.map((cell) => [cell, { ...cell, size: 0 }]);
  const count = Math.max(a.length, b.length);
  return Array.from({ length: count }, (_, k) => [
    a[Math.floor(k * a.length / count)],
    b[Math.floor(k * b.length / count)],
  ]);
}

export const morphTiming = {
  // Each letter starts a beat after the one before it, left to right.
  stagger: 22,
  jitter: 20,
  duration: 440,
};

function middle(cells: Cell[]) {
  if (!cells.length) return { x: 0, y: 0, height: 0 };
  const ys = cells.map((c) => c.y);
  return {
    x: cells.reduce((sum, c) => sum + c.x, 0) / cells.length,
    y: ys.reduce((sum, y) => sum + y, 0) / cells.length,
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export function planMorph(
  from: Cell[][],
  to: Cell[][],
  random = Math.random,
  timing = morphTiming,
): Particle[] {
  const particles: Particle[] = [];
  const glyphs = Math.max(from.length, to.length);
  for (let glyph = 0; glyph < glyphs; glyph++) {
    const source = from[glyph] ?? [];
    const target = to[glyph] ?? [];
    const center = middle(source.length ? source : target);
    const hop = Math.min(28, Math.max(middle(source).height, middle(target).height) * 0.14);
    for (const [start, end] of pairGlyph(source, target)) {
      particles.push({
        from: start,
        to: end,
        glyph,
        delay: glyph * timing.stagger + random() * timing.jitter,
        duration: timing.duration,
        hop,
        swell: Math.max(start.size, end.size) * 0.9,
        angle: Math.atan2(start.y - center.y, start.x - center.x),
      });
    }
  }
  return particles;
}

// The first appearance is a print pass: letter by letter, a head sweeps
// left to right and each pixel drops two steps onto the page as it passes.
export function planArrival(to: Cell[][], random = Math.random): Particle[] {
  const pass = 34;
  return to.flatMap((cells, glyph) => {
    if (!cells.length) return [];
    const xs = cells.map((c) => c.x);
    const left = Math.min(...xs);
    const width = Math.max(...xs) - left || 1;
    return cells.map((end) => ({
      from: { x: end.x, y: end.y - end.size * 2, size: 0 },
      to: end,
      glyph,
      delay: (glyph + (end.x - left) / width) * pass + random() * 12,
      duration: 180,
      hop: 0,
      swell: 0,
      angle: 0,
    }));
  });
}

export function morphLength(particles: Particle[]) {
  return particles.reduce((longest, p) => Math.max(longest, p.delay + p.duration), 0);
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function particleAt(p: Particle, elapsed: number): Cell {
  const t = Math.min(1, Math.max(0, (elapsed - p.delay) / p.duration));
  const e = ease(t);
  // Zero at both ends, so a pixel starts and lands exactly on its cell.
  const arc = t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;
  return {
    x: p.from.x + (p.to.x - p.from.x) * e + Math.cos(p.angle) * p.swell * arc,
    y: p.from.y + (p.to.y - p.from.y) * e + Math.sin(p.angle) * p.swell * arc - p.hop * arc,
    size: p.from.size + (p.to.size - p.from.size) * e,
  };
}
