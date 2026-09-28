import {
  morphLength, particleAt, planArrival, planMorph, sampleCells,
  type Cell, type Particle,
} from '@/lib/pixel-type';

export type GlyphLayout = Cell[][];

let scratch: CanvasRenderingContext2D | null | undefined;
const sampled = new WeakMap<HTMLElement, { key: string; glyphs: GlyphLayout }>();

// Rasterizes every character of the rendered wordmark where the browser laid
// it out, so the pixels land exactly on the type that replaces them. Letters
// come back in reading order: J, J, H, D, I, G, I, T, A, L, then L, L, C.
export function sampleWordmark(type: HTMLElement, canvas: HTMLCanvasElement): GlyphLayout {
  scratch ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const ctx = scratch;
  if (!ctx) return [];
  const origin = canvas.getBoundingClientRect();
  const letters: Array<{ char: string; font: string; cell: number; x: number; y: number }> = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(type, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    const style = getComputedStyle(node.parentElement!);
    const size = parseFloat(style.fontSize);
    const font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
    // About 24 pixels per em still reads as the face it came from.
    const cell = Math.max(2, Math.round(size / 24));
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (!char.trim()) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const box = range.getClientRects()[0];
      if (!box) continue;
      letters.push({ char, font, cell, x: box.left - origin.left, y: box.top - origin.top });
    }
  }
  // The previous destination is normally the next source. Check the actual
  // layout before reusing it, including resizes, tracking and press transforms.
  // Keep only one sample per wordmark, and never cache a loading font's fallback.
  const key = JSON.stringify([document.fonts.size, letters]);
  const previous = sampled.get(type);
  if (document.fonts.status === 'loaded' && previous?.key === key) return previous.glyphs;
  const glyphs: GlyphLayout = [];
  for (const { char, font, cell, x: penX, y } of letters) {
    ctx.font = font;
    const m = ctx.measureText(char);
    const baseline = y + m.fontBoundingBoxAscent;
    const left = Math.floor(penX - m.actualBoundingBoxLeft) - cell;
    const top = Math.floor(baseline - m.actualBoundingBoxAscent) - cell;
    const width = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + cell * 2;
    const height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + cell * 2;
    if (width <= 0 || height <= 0) continue;
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.font = font;
    ctx.fillText(char, penX - left, baseline - top);
    // A low threshold keeps hairlines, like the bar of a Garamond H.
    glyphs.push(sampleCells(ctx.getImageData(0, 0, width, height).data, width, height, left, top, cell, 0.2));
  }
  if (document.fonts.status === 'loaded') sampled.set(type, { key, glyphs });
  else sampled.delete(type);
  return glyphs;
}

export type PixelMorph = ReturnType<typeof createPixelMorph>;

// Jitter has its own little generator, so the page's Math.random stays with
// the deck (and browser checks can steer the deck without moving pixels).
function jitter(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function createPixelMorph(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  const random = jitter(Math.floor(performance.now()) % 2147483646 + 1);
  let particles: Particle[] = [];
  let started = 0;
  let length = 0;
  let frame = 0;
  let color = '';
  let finish: (() => void) | undefined;

  function fit() {
    const rect = canvas.getBoundingClientRect();
    // The art uses whole and half CSS pixels. Two device pixels per CSS pixel
    // preserve those edges without a nine-times-larger bitmap on a 3× phone.
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(now: number) {
    if (!ctx) return;
    const elapsed = now - started;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    for (const particle of particles) {
      const { x, y, size } = particleAt(particle, elapsed);
      if (size < 0.5) continue;
      // Every frame is a clean bitmap: pixels snap to the grid of the letter
      // they are becoming, so the name tweens like pixel art instead of dust.
      const grid = particle.to.size || particle.from.size;
      const side = Math.min(grid, Math.max(1, Math.round(size)));
      const left = Math.round((x - grid / 2) / grid) * grid + (grid - side) / 2;
      const top = Math.round((y - grid / 2) / grid) * grid + (grid - side) / 2;
      ctx.fillRect(left, top, side, side);
    }
    if (elapsed < length) {
      frame = requestAnimationFrame(draw);
    } else {
      frame = 0;
      finish?.();
    }
  }

  function play(next: Particle[], ink: string, onDone: () => void) {
    cancelAnimationFrame(frame);
    // Without a canvas to draw on, the letters simply come back.
    if (!ctx) return onDone();
    particles = next;
    color = ink;
    finish = onDone;
    length = morphLength(next);
    started = performance.now();
    draw(started);
  }

  return {
    get running() {
      return frame !== 0;
    },
    fit,
    // Where every pixel is right now, grouped by letter, so a new shuffle can
    // start from the middle of the last one instead of jumping.
    current(): GlyphLayout {
      const elapsed = performance.now() - started;
      const layout: GlyphLayout = [];
      for (const particle of particles) {
        (layout[particle.glyph] ??= []).push(particleAt(particle, elapsed));
      }
      return Array.from(layout, (cells) => cells ?? []);
    },
    morph(from: GlyphLayout, to: GlyphLayout, ink: string, onDone: () => void) {
      play(planMorph(from, to, random), ink, onDone);
    },
    arrive(to: GlyphLayout, ink: string, onDone: () => void) {
      play(planArrival(to, random), ink, onDone);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      finish = undefined;
      particles = [];
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
