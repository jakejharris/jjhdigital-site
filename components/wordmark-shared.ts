import { useEffect, useLayoutEffect } from 'react';
import type { FontLabFont } from '@/components/font-lab-catalog';
import { homepageMoods, type HomepageStyleSelection } from '@/lib/homepage-design/choices';

export const defaultFontName = 'Cormorant Garamond';
export const previewText = 'JJH DIGITAL LLC';
export type FontLoadState = 'ready' | 'loading' | 'error';
export type DesignSnapshot = { fontName: string; style: HomepageStyleSelection };
export type WordmarkController = {
  selectedFontName: string;
  loadState: FontLoadState;
  style: HomepageStyleSelection;
  selectFont: (font: FontLabFont) => void;
  resetDesign: () => void;
};

const localFonts: Record<string, string> = {
  'Work Sans': '/fonts/work-sans-wordmark.woff2',
  'Gloock': '/fonts/gloock-wordmark.woff2',
  'Unbounded': '/fonts/unbounded-wordmark.woff2',
  'Monoton': '/fonts/monoton-wordmark.woff2',
  'Bebas Neue': '/fonts/bebas-neue-wordmark.woff2',
};

export const likedFonts: FontLabFont[] = homepageMoods.map(({ fontName }) => ({
  name: fontName,
  category: fontName === 'Cormorant Garamond' || fontName === 'Gloock' ? 'Serif' : fontName === 'Monoton' ? 'Display' : 'Sans',
}));
export function isLikedFontName(name: string) {
  return likedFonts.some((font) => font.name === name);
}
export function fontFamily(font: FontLabFont) {
  const fallback = font.category === 'Sans' ? 'sans-serif' : font.category === 'Mono' ? 'monospace' : 'serif';
  return `"${font.name}", ${fallback}`;
}
export const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const fontLoadPromises = new Map<string, Promise<void>>();
export const loadedFontNames = new Set<string>([defaultFontName]);

// Public moods use tiny local glyph subsets. The remote catalog is a dev-only
// convenience. A failed request is removable and retryable, never a late swap.
export function loadWordmarkFont(fontName: string): Promise<void> {
  if (loadedFontNames.has(fontName)) return Promise.resolve();
  const existing = fontLoadPromises.get(fontName);
  if (existing) return existing;

  let link: HTMLLinkElement | undefined;
  let timeout: ReturnType<typeof setTimeout>;
  const load = async () => {
    if (localFonts[fontName]) {
      const face = new FontFace(fontName, `url("${localFonts[fontName]}")`, { weight: '400', style: 'normal' });
      await face.load();
      document.fonts.add(face);
    } else if (process.env.NODE_ENV === 'development') {
      await new Promise<void>((resolve, reject) => {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `/api/font-lab?${new URLSearchParams({ asset: 'css', family: fontName })}`;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Unable to load ${fontName}`));
        document.head.appendChild(link);
      });
      const faces = await document.fonts.load(`400 108px "${fontName}"`, previewText);
      if (!faces.length) throw new Error(`${fontName} was not registered`);
    } else {
      throw new Error('Unknown font');
    }
  };
  const promise = Promise.race([
    load(),
    new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`Timed out loading ${fontName}`)), 8000);
    }),
  ]).then(() => { loadedFontNames.add(fontName); }).finally(() => clearTimeout(timeout));

  fontLoadPromises.set(fontName, promise);
  void promise.catch(() => {
    link?.remove();
    fontLoadPromises.delete(fontName);
  });
  return promise;
}
