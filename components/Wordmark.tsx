'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw, Shuffle } from 'lucide-react';
import type { FontLabFont } from '@/components/font-lab-catalog';
import {
  defaultFontName, fontFamily, likedFonts, loadedFontNames, loadWordmarkFont,
  useIsomorphicLayoutEffect, type DesignSnapshot, type FontLoadState,
} from '@/components/wordmark-shared';
import {
  defaultHomepageStyle, homepageMoods, homepagePalettes, nextHomepageMood,
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
  const [canUndo, setCanUndo] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const wordmarkRef = useRef<HTMLButtonElement>(null);
  const typeRef = useRef<HTMLSpanElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const undoSpace = useRef(false);
  const current = useRef(initialDesign);
  const request = useRef(0);
  const history = useRef(createDesignHistory(initialDesign));
  const previewFonts = useRef(new Map<string, FontLabFont>());

  const palette = homepagePalettes[design.style.palette];
  const surface = surfaceTreatments[design.style.surface];
  const font = likedFonts.find((candidate) => candidate.name === design.fontName) ?? previewFonts.current.get(design.fontName);

  const showDesign = useCallback((snapshot: DesignSnapshot, action: 'push' | 'back' | 'reset' | 'preview') => {
    const id = ++request.current;
    current.current = snapshot;
    setSelectedFontName(snapshot.fontName);

    function apply() {
      if (id !== request.current) return;
      if (action === 'push') history.current.push(snapshot);
      setDesign(snapshot);
      setLoadState('ready');
      setCanUndo(history.current.canGoBack);
      const mood = homepageMoods.find((item) => item.fontName === snapshot.fontName);
      setAnnouncement(`${mood?.name ?? snapshot.fontName} style${action === 'back' ? ' restored' : ''}.`);
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
    showDesign(nextHomepageMood(current.current.fontName), 'push');
  }, [showDesign]);
  const undo = useCallback(() => {
    // Cancel an in-flight selection before walking back through visible moods.
    const snapshot = history.current.back();
    if (!history.current.canGoBack && document.activeElement === undoRef.current) wordmarkRef.current?.focus();
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
  // caption, paragraph, or contact, even for the widest face or at 200% zoom.
  useIsomorphicLayoutEffect(() => {
    const type = typeRef.current;
    const button = wordmarkRef.current;
    if (!type || !button) return;
    let active = true;
    function fit() {
      if (!active || !type || !button) return;
      type.style.fontSize = '';
      const width = button.clientWidth;
      if (!width) return;
      const contentWidth = Math.max(...Array.from(type.children, (el) => el.getBoundingClientRect().width), type.scrollWidth);
      if (contentWidth > width) {
        const size = parseFloat(getComputedStyle(type).fontSize);
        type.style.fontSize = `${size * width / contentWidth}px`;
      }
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(button);
    void document.fonts.ready.then(fit);
    return () => { active = false; observer.disconnect(); };
  }, [design]);

  useEffect(() => {
    const type = typeRef.current;
    if (design === initialDesign || !type || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = type.animate(
      [{ transform: 'translateY(4px)', opacity: 0.8 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' }
    );
    return () => animation.cancel();
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
            onClick={shuffle}
            onKeyDown={onShuffleKeyDown}
            onKeyUp={onShuffleKeyUp}
          >
            <span ref={typeRef} className="wordmark-type" style={{ fontFamily: design.fontName !== defaultFontName && font ? fontFamily(font) : undefined }}>
              <span>JJH</span>{' '}<span>DIGITAL</span>
            </span>
          </button>
        </h1>
        <div className="masthead-caption">
          <span aria-hidden="true">LLC</span>
          <div className="mood-controls">
            <button type="button" className="mood-change" onClick={shuffle} onKeyDown={onShuffleKeyDown} onKeyUp={onShuffleKeyUp} aria-label="Change the mood" aria-keyshortcuts="Space">
              <Shuffle size={13} aria-hidden="true" />
              <span id="shuffle-hint">{loadState === 'error' ? 'Try another mood' : 'Change the mood'}</span>
            </button>
            <button ref={undoRef} type="button" className="mood-undo" onClick={undo} disabled={!canUndo} aria-label="Previous style" aria-keyshortcuts="Shift+Space" title="Previous style · Shift + Space">
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <span className="sr-only" role="status" aria-label="Style" aria-live="polite">{announcement}</span>
      {StyleLab && <StyleLab controller={{ selectedFontName, loadState, style: design.style, selectFont, resetDesign }} />}
    </>
  );
}
