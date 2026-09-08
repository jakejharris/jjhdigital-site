import { useEffect, useLayoutEffect } from 'react';
import {
  fontLabCatalog,
  likedFontNames,
  type FontLabFont,
} from '@/components/font-lab-catalog';
import type { HomepageStyleSelection } from '@/lib/homepage-design/choices';

// Shared between the production wordmark and the development style lab.

export const defaultFontName = 'Cormorant Garamond';
export const previewText = 'JJH DIGITAL LLC';

export type FontLoadState = 'ready' | 'loading' | 'error';

export type DesignSnapshot = {
  fontName: string;
  style: HomepageStyleSelection;
};

// What the lab needs from the wordmark: read the current selection, pick a
// font (any catalog font in development), and reset to the default design.
export type WordmarkController = {
  selectedFontName: string;
  loadState: FontLoadState;
  style: HomepageStyleSelection;
  selectFont: (font: FontLabFont) => void;
  resetDesign: () => void;
};

export const likedFonts = likedFontNames.map(
  (name) => fontLabCatalog.find((font) => font.name === name)!
);

export function isLikedFontName(name: string) {
  return (likedFontNames as readonly string[]).includes(name);
}

// The shuffle draws its font from the liked set and never repeats the current
// one. A font outside the set (lab browsing) can move to any liked font.
export function nextLikedFontName(currentName: string, random = Math.random) {
  const currentIndex = likedFonts.findIndex((font) => font.name === currentName);
  if (currentIndex < 0) {
    return likedFonts[Math.floor(random() * likedFonts.length)].name;
  }
  const offset = Math.floor(random() * (likedFonts.length - 1)) + 1;
  return likedFonts[(currentIndex + offset) % likedFonts.length].name;
}

export function fontFamily(font: FontLabFont) {
  const fallback =
    font.category === 'Sans' ? 'sans-serif' : font.category === 'Mono' ? 'monospace' : 'serif';
  return `"${font.name}", ${fallback}`;
}

// SSR-safe layout effect (the server bundle must not call useLayoutEffect).
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const fontLoadPromises = new Map<string, Promise<void>>();
export const loadedFontNames = new Set<string>([defaultFontName]);
const FONT_LOAD_TIMEOUT_MS = 8_000;

function fontStylesheetUrl(fontName: string) {
  const params = new URLSearchParams({ asset: 'css', family: fontName });
  return `/api/font-lab?${params.toString()}`;
}

// Loads a font through the same-origin proxy (the CSP forbids Google Fonts
// directly) and resolves once the face is registered. Cached per family;
// a failed or timed-out load clears its cache entry so a later attempt retries.
export function loadWordmarkFont(fontName: string) {
  const existingPromise = fontLoadPromises.get(fontName);
  if (existingPromise) return existingPromise;

  const loadPromise = new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontStylesheetUrl(fontName);
    link.dataset.fontLabFamily = fontName;

    link.onload = () => {
      document.fonts
        .load(`400 108px "${fontName}"`, previewText)
        .then((faces) => {
          if (faces.length === 0) {
            throw new Error(`${fontName} was not registered`);
          }
          loadedFontNames.add(fontName);
          resolve();
        })
        .catch(reject);
    };
    link.onerror = () => reject(new Error(`Unable to load ${fontName}`));

    document.head.appendChild(link);
  });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const promise = Promise.race([
    loadPromise,
    new Promise<void>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Timed out loading ${fontName}`)),
        FONT_LOAD_TIMEOUT_MS
      );
    }),
  ]).finally(() => clearTimeout(timeoutId));

  fontLoadPromises.set(fontName, promise);
  promise.catch(() => fontLoadPromises.delete(fontName));
  return promise;
}
