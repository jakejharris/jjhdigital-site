'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw } from 'lucide-react';
import type { FontLabFont } from '@/components/font-lab-catalog';
import {
  defaultFontName, fontFamily, likedFonts, loadedFontNames, loadWordmarkFont,
  useIsomorphicLayoutEffect, type DesignSnapshot, type FontLoadState,
} from '@/components/wordmark-shared';
import {
  defaultHomepageStyle, homepagePalettes, nextHomepageMood,
  surfaceTreatments, wordmarkTracking,
} from '@/lib/homepage-design/choices';
import { createDesignHistory } from '@/lib/homepage-design/history';

const StyleLab = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/components/StyleLab'), { ssr: false })
  : null;
const initialDesign: DesignSnapshot = { fontName: defaultFontName, style: defaultHomepageStyle };

export default function Wordmark({ baseFontClassName }: { baseFontClassName: string }) {
  const [design, setDesign] = useState(initialDesign);
  const [selectedFontName, setSelectedFontName] = useState(defaultFontName);
  const [loadState, setLoadState] = useState<FontLoadState>('ready');
  const [turns, setTurns] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const wordmarkRef = useRef<HTMLButtonElement>(null);
  const typeRef = useRef<HTMLSpanElement>(null);
  const undoSpace = useRef(false);
  const current = useRef(initialDesign);
  const request = useRef(0);
  const history = useRef(createDesignHistory(initialDesign));
  const previewFonts = useRef(new Map<string, FontLabFont>());

  const palette = homepagePalettes[design.style.palette];
  const surface = surfaceTreatments[design.style.surface];
  const font = likedFonts.find((candidate) => candidate.name === design.fontName) ?? previewFonts.current.get(design.fontName);
  const displayFamily = design.fontName !== defaultFontName && font ? fontFamily(font) : undefined;

  const showDesign = useCallback((snapshot: DesignSnapshot, action: 'push' | 'back' | 'reset' | 'preview') => {
    const id = ++request.current;
    current.current = snapshot;
    setSelectedFontName(snapshot.fontName);

    function apply() {
      if (id !== request.current) return;
      if (action === 'push') history.current.push(snapshot);
      setDesign(snapshot);
      setLoadState('ready');
      const name = `${homepagePalettes[snapshot.style.palette].name}, ${snapshot.fontName}, ${surfaceTreatments[snapshot.style.surface].name}`;
      setAnnouncement(`${name}${action === 'back' ? ' restored' : ''}.`);
    }

    if (loadedFontNames.has(snapshot.fontName)) {
      apply();
      return;
    }
    setLoadState('loading');
    void loadWordmarkFont(snapshot.fontName).then(apply).catch(() => {
      if (id !== request.current) return;
      setLoadState('error');
      setAnnouncement('That style could not load. Try another mood.');
    });
  }, []);

  const shuffle = useCallback(() => {
    setTurns((value) => value + 1);
    showDesign(nextHomepageMood(current.current), 'push');
  }, [showDesign]);
  const undo = useCallback(() => {
    // Cancel an in-flight selection before walking back through visible moods.
    const snapshot = history.current.back();
    if (snapshot) setTurns((value) => value - 1);
    showDesign(snapshot ?? history.current.current, 'back');
  }, [showDesign]);
  const resetDesign = useCallback(() => { showDesign(history.current.reset(), 'reset'); }, [showDesign]);
  const selectFont = useCallback((selected: FontLabFont) => {
    previewFonts.current.set(selected.name, selected);
    showDesign({ ...current.current, fontName: selected.name }, 'preview');
  }, [showDesign]);

  useEffect(() => {
    likedFonts.forEach(({ name }) => { void loadWordmarkFont(name).catch(() => undefined); });
    return () => { request.current += 1; };
  }, []);

  // The masthead has its own reserved space. Fitting type never moves the
  // paragraph or contact, even for the widest face or at 200% zoom.
  useIsomorphicLayoutEffect(() => {
    const type = typeRef.current;
    const button = wordmarkRef.current;
    if (!type || !button) return;
    let active = true;
    function fit() {
      if (!active || !type || !button) return;
      type.style.fontSize = '';
      const width = button.clientWidth;
      if (width <= 1) return;
      const measureWidth = () => Math.max(
        type.scrollWidth,
        ...Array.from(type.children, (el) => el.getBoundingClientRect().width)
      );
      let contentWidth = measureWidth();
      let size = parseFloat(getComputedStyle(type).fontSize);
      // Glyph rounding makes a proportional estimate inexact across browsers.
      // Round down to whole CSS pixels so corrections always make progress,
      // then verify the actual width before painting. Never shrink to zero.
      while (contentWidth > width && size > 1) {
        size = Math.max(1, Math.floor(size * (width - 1) / contentWidth));
        type.style.fontSize = `${size}px`;
        contentWidth = measureWidth();
      }
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(button);
    void document.fonts.ready.then(fit);
    return () => { active = false; observer.disconnect(); };
  }, [design]);

  useEffect(() => {
    if (design === initialDesign || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = typeRef.current?.animate(
      [{ transform: 'translateY(4px)', opacity: 0.8 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' }
    );
    return () => animation?.cancel();
  }, [design]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, select, textarea, [contenteditable]')) return;
      event.preventDefault();
      if (event.repeat) return;
      if (event.shiftKey) undo();
      else shuffle();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shuffle, undo]);

  function onShuffleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.code !== 'Space' || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    undoSpace.current = true;
    if (!event.repeat) undo();
  }
  function onShuffleKeyUp(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.code !== 'Space' || !undoSpace.current) return;
    event.preventDefault();
    undoSpace.current = false;
  }

  return (
    <>
      <style>{`:root {
        --homepage-background: ${palette.background};
        --homepage-ink: ${palette.ink};
        --homepage-body: ${palette.body};
        --homepage-accent: ${palette.accent};
        --homepage-grid: ${palette.grid};
        --homepage-surface-image: ${surface.image};
        --homepage-surface-size: ${surface.size};
        --homepage-wordmark-tracking: ${wordmarkTracking[design.style.tracking].value};
      }`}</style>
      <div className="masthead">
        <h1 id="company-name" aria-label="JJH DIGITAL LLC">
          <button
            ref={wordmarkRef}
            type="button"
            className={`wordmark ${baseFontClassName}`}
            aria-label="Shuffle the style"
            aria-describedby="shuffle-hint"
            aria-busy={loadState === 'loading'}
            onClick={(event) => {
              // Release pointer focus before a later Space shortcut can outline the masthead.
              if (event.detail > 0) event.currentTarget.blur();
              shuffle();
            }}
            onKeyDown={onShuffleKeyDown}
            onKeyUp={onShuffleKeyUp}
          >
            <span ref={typeRef} className="wordmark-type" style={{ fontFamily: displayFamily }}>
              <span>JJH</span>{' '}
              <span className="wordmark-ending">
                <span className="wordmark-digital">DIGITAL</span>
                <span className="wordmark-llc" aria-hidden="true">LLC</span>
              </span>
            </span>
          </button>
        </h1>
        <div className="mood-controls">
          <button
            type="button"
            className="mood-rotate"
            onClick={shuffle}
            onKeyDown={onShuffleKeyDown}
            onKeyUp={onShuffleKeyUp}
            aria-label="Next style"
            aria-describedby="shuffle-hint"
            aria-keyshortcuts="Space Shift+Space"
            aria-busy={loadState === 'loading'}
            title="Next style · Shift + Space to undo"
          >
            <span className="mood-rotate-glyph" style={{ '--mood-turn': `${turns * -360}deg` } as CSSProperties}>
              <RotateCcw className="mood-rotate-icon" size={20} strokeWidth={1.5} aria-hidden="true" />
            </span>
          </button>
          {loadState === 'error' && <span className="mood-error">Style unavailable. Try again.</span>}
        </div>
      </div>
      <span id="shuffle-hint" className="sr-only">Tap or press Space to shuffle. Shift + Space goes back.</span>
      <span className="sr-only" role="status" aria-label="Style" aria-live="polite">{announcement}</span>
      {StyleLab && <StyleLab controller={{ selectedFontName, loadState, style: design.style, selectFont, resetDesign }} />}
    </>
  );
}
