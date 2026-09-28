'use client';

import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { flushSync } from 'react-dom';
import Die from '@/components/Die';
import type { FontLabFont } from '@/components/font-lab-catalog';
import { createPixelMorph, sampleWordmark, type GlyphLayout, type PixelMorph } from '@/components/pixel-morph';
import {
  defaultFontName, fontFamily, likedFonts, loadedFontNames, loadWordmarkFont,
  useIsomorphicLayoutEffect, type DesignSnapshot, type FontLoadState,
} from '@/components/wordmark-shared';
import {
  defaultHomepageStyle, describeMood, homepageMoods, homepageTypefaces, moodForNumber,
  moodNumber, moodNumberFromHash, nextHomepageMood, sameMood, secretNumber,
} from '@/lib/homepage-design/choices';
import { createDesignHistory } from '@/lib/homepage-design/history';
import { site } from '@/lib/site';

const StyleLab = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/components/StyleLab'), { ssr: false })
  : null;
const initialDesign: DesignSnapshot = { fontName: defaultFontName, style: defaultHomepageStyle };
const listed = homepageMoods.length;
const moving = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
// Milliseconds after navigation. The stylesheet shows the name at 1.2 s no
// matter what; past this point the print pass is skipped.
const arrivalBudget = 1000;
// The colophon footer (the mood's number, face, paper, and how many have been
// seen) is parked for now. Set this to true to bring it back. The deck, the
// foil edition, and shared links work either way.
const showColophon: boolean = false;

type Action = 'push' | 'back' | 'reset' | 'preview';

export default function Letterhead({ baseFontClassName, children }: { baseFontClassName: string; children: ReactNode }) {
  const [design, setDesign] = useState(initialDesign);
  const [selectedFontName, setSelectedFontName] = useState(defaultFontName);
  const [loadState, setLoadState] = useState<FontLoadState>('ready');
  const [turns, setTurns] = useState(0);
  const [seenCount, setSeenCount] = useState(1);
  const [announcement, setAnnouncement] = useState('');
  const mastheadRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLButtonElement>(null);
  const dieRef = useRef<HTMLButtonElement>(null);
  const typeRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const morph = useRef<PixelMorph | null>(null);
  // What the pixels start from on the next render: the letters as they were,
  // or a print pass when the page first arrives.
  const source = useRef<GlyphLayout | 'arrive' | null>(null);
  const opened = useRef(false);
  // Where the last press landed, so a new sheet of paper can spread from it.
  const pressed = useRef<{ x: number; y: number } | null>(null);
  const spreading = useRef<ViewTransition | null>(null);
  const displayed = useRef(initialDesign);
  const undoSpace = useRef(false);
  const current = useRef(initialDesign);
  const request = useRef(0);
  const trail = useRef(createDesignHistory(initialDesign));
  const seen = useRef(new Set([1]));
  const previewFonts = useRef(new Map<string, FontLabFont>());

  const number = moodNumber(design);
  const secret = number === secretNumber;
  const face = homepageTypefaces.findIndex((candidate) => candidate.fontName === design.fontName);
  const font = likedFonts.find((candidate) => candidate.name === design.fontName) ?? previewFonts.current.get(design.fontName);
  const displayFamily = design.fontName !== defaultFontName && font ? fontFamily(font) : undefined;

  const reveal = useCallback(() => document.documentElement.classList.remove('intro'), []);

  // The letters as they are on screen right now, mid-flight or at rest.
  const capture = useCallback((): GlyphLayout | null => {
    const engine = morph.current;
    if (!engine || !canvasRef.current || !typeRef.current || !moving()) return null;
    return engine.running ? engine.current() : sampleWordmark(typeRef.current, canvasRef.current);
  }, []);

  const startMorph = useCallback(() => {
    const from = source.current;
    source.current = null;
    const engine = morph.current;
    const canvas = canvasRef.current;
    const masthead = mastheadRef.current;
    const type = typeRef.current;
    if (!from || !engine || !canvas || !masthead || !type) {
      reveal();
      return;
    }
    engine.fit();
    const to = sampleWordmark(type, canvas);
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--homepage-ink').trim();
    // The canvas takes over from here, so the no-script fallback can stand down.
    masthead.dataset.morphing = 'true';
    reveal();
    // The last frame stays on the canvas while it fades and the type returns.
    const done = () => { delete masthead.dataset.morphing; };
    if (from === 'arrive') engine.arrive(to, ink, done);
    else engine.morph(from, to, ink, done);
  }, [reveal]);

  const showDesign = useCallback((snapshot: DesignSnapshot, action: Action) => {
    const id = ++request.current;
    current.current = snapshot;
    setSelectedFontName(snapshot.fontName);

    function apply() {
      if (id !== request.current) return;
      opened.current = true;
      if (action === 'push') trail.current.push(snapshot);
      const shown = moodNumber(snapshot);
      if (action === 'push' && shown) {
        // The foil edition closes a full round; the next draw starts a new one.
        if (shown === secretNumber) seen.current = new Set();
        else seen.current.add(shown);
      }
      const seenNow = seen.current.size;
      source.current = capture();
      const press = pressed.current;
      pressed.current = null;
      const said = shown === secretNumber
        ? `No. ${secretNumber} of ${listed}. Gold foil.`
        : `${shown ? `No. ${shown}: ` : ''}${describeMood(snapshot)}.`;
      // The count and the mood change together, even mid-transition.
      const commit = () => {
        setDesign(snapshot);
        setSeenCount(seenNow);
        setLoadState('ready');
        setAnnouncement(action === 'back' ? `${said.slice(0, -1)}, restored.` : said);
      };
      const paper = ({ style }: DesignSnapshot) => `${style.palette}/${style.surface}`;
      if (source.current && paper(snapshot) !== paper(displayed.current) && 'startViewTransition' in document) {
        const die = dieRef.current?.getBoundingClientRect();
        const transition = spreadPaper(commit, press ?? (die
          ? { x: die.left + die.width / 2, y: die.top + die.height / 2 }
          : { x: innerWidth / 2, y: innerHeight / 3 }));
        spreading.current = transition;
        // A newer roll skips this transition; only the current one may clear it.
        const settle = () => { if (spreading.current === transition) spreading.current = null; };
        transition.finished.then(settle, settle);
      } else {
        commit();
      }
    }

    if (loadedFontNames.has(snapshot.fontName)) {
      apply();
      return;
    }
    setLoadState('loading');
    void loadWordmarkFont(snapshot.fontName).then(apply).catch(() => {
      if (id !== request.current) return;
      // The page still shows the last mood, so the deck deals from there.
      current.current = displayed.current;
      setLoadState('error');
      setAnnouncement('That mood could not load. Try another.');
    });
  }, [capture]);

  const shuffle = useCallback(() => {
    setTurns((value) => value + 1);
    showDesign(nextHomepageMood(current.current, seen.current), 'push');
  }, [showDesign]);
  const undo = useCallback(() => {
    // Cancel an in-flight selection before walking back through visible moods.
    const snapshot = trail.current.back();
    if (snapshot) setTurns((value) => value - 1);
    showDesign(snapshot ?? trail.current.current, 'back');
  }, [showDesign]);
  const resetDesign = useCallback(() => { showDesign(trail.current.reset(), 'reset'); }, [showDesign]);
  const selectFont = useCallback((selected: FontLabFont) => {
    previewFonts.current.set(selected.name, selected);
    showDesign({ ...current.current, fontName: selected.name }, 'preview');
  }, [showDesign]);

  useEffect(() => {
    if (canvasRef.current) morph.current = createPixelMorph(canvasRef.current);
    const asked = moodNumberFromHash(location.hash);
    const edition = asked && asked !== 1 ? moodForNumber(asked) : undefined;
    const startedAt = request.current;
    let cancelled = false;

    // A shared link opens on its edition; otherwise the page arrives as it is.
    void (async () => {
      const opening = edition && await loadWordmarkFont(edition.fontName).then(() => edition, () => undefined);
      await document.fonts.ready;
      if (cancelled) return;
      // The other faces load once the name has what it needs.
      likedFonts.forEach(({ name }) => { void loadWordmarkFont(name).catch(() => undefined); });
      // A visitor who shuffled before this finished has already moved on.
      if (request.current !== startedAt) return reveal();
      opened.current = true;
      // After a slow start the name is already showing; printing it again
      // would only delay it.
      if (document.documentElement.classList.contains('intro') && moving() && performance.now() < arrivalBudget) {
        source.current = 'arrive';
      }
      if (opening && asked) {
        trail.current = createDesignHistory(opening);
        current.current = opening;
        seen.current = new Set(asked <= listed ? [asked] : []);
        setSeenCount(seen.current.size);
        setSelectedFontName(opening.fontName);
        setDesign(opening);
      } else {
        // Nothing to open, or its face failed: start from No. 1, and let the
        // address say so.
        applyAttributes(initialDesign);
        if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
        if (source.current) startMorph();
        else reveal();
      }
    })();

    function onHashChange() {
      const asked = moodNumberFromHash(location.hash);
      const edition = asked ? moodForNumber(asked) : undefined;
      if (edition && !sameMood(edition, current.current)) showDesign(edition, 'push');
    }
    window.addEventListener('hashchange', onHashChange);
    return () => {
      cancelled = true;
      request.current += 1;
      morph.current?.stop();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [reveal, showDesign, startMorph]);

  // The masthead has its own reserved space. Fitting type never moves the
  // paragraph or contact, even for the widest face or at 200% zoom.
  useIsomorphicLayoutEffect(() => {
    displayed.current = design;
    // Until a shared link is resolved, the paper painted before hydration stays.
    if (opened.current) {
      applyAttributes(design);
      const shown = moodNumber(design);
      const hash = shown && shown !== 1 ? `#${shown}` : '';
      if (location.hash !== hash) history.replaceState(history.state, '', hash || location.pathname + location.search);
    }
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
    if (source.current) startMorph();
    else if (opened.current) reveal();
    const observer = new ResizeObserver(fit);
    observer.observe(button);
    void document.fonts.ready.then(fit);
    return () => { active = false; observer.disconnect(); };
  }, [design, startMorph]);

  // While paper spreads, the browser sends every tap to <html>. A tap that
  // lands on the name or the die still rolls, so fast rolls keep coming.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!spreading.current || event.target !== document.documentElement) return;
      const hit = [dieRef.current, wordmarkRef.current].some((control) => {
        const box = control?.getBoundingClientRect();
        return box && event.clientX >= box.left && event.clientX <= box.right &&
          event.clientY >= box.top && event.clientY <= box.bottom;
      });
      if (!hit) return;
      pressed.current = { x: event.clientX, y: event.clientY };
      shuffle();
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [shuffle]);

  // Tilt the foil: the sheen follows the pointer across the page.
  useEffect(() => {
    const type = typeRef.current;
    if (!secret || !type || !moving()) return;
    let frame = 0;
    function onPointerMove(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        type!.style.setProperty('--foil-shift', `${Math.round(event.clientX / innerWidth * 100)}%`);
      });
    }
    window.addEventListener('pointermove', onPointerMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      type.style.removeProperty('--foil-shift');
    };
  }, [secret]);

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

  const progress = secret
    ? 'You found the one not on the list.'
    : seenCount >= listed
      ? `All ${listed} seen. Roll once more.`
      : `${seenCount} of ${listed} seen.`;

  return (
    <>
      <section className="letterhead-content" aria-labelledby="company-name">
        <div ref={mastheadRef} className="masthead">
          <h1 id="company-name" aria-label="JJH DIGITAL LLC">
            <button
              ref={wordmarkRef}
              type="button"
              className={`wordmark ${baseFontClassName}${secret ? ' wordmark-foil' : ''}`}
              aria-label="Change the mood"
              aria-describedby="shuffle-hint"
              aria-busy={loadState === 'loading'}
              onPointerDown={(event) => { pressed.current = { x: event.clientX, y: event.clientY }; }}
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
          <canvas ref={canvasRef} className="wordmark-pixels" aria-hidden="true" />
          <div className="mood-controls">
            <button
              ref={dieRef}
              type="button"
              className="mood-die"
              onPointerDown={(event) => { pressed.current = { x: event.clientX, y: event.clientY }; }}
              onClick={shuffle}
              onKeyDown={onShuffleKeyDown}
              onKeyUp={onShuffleKeyUp}
              aria-label="Roll the die"
              aria-describedby="shuffle-hint"
              aria-keyshortcuts="Space Shift+Space"
              aria-busy={loadState === 'loading'}
              title="Roll for another mood · Shift + Space goes back"
            >
              <span className="mood-die-glyph" style={{ '--mood-turn': `${turns * 360}deg` } as CSSProperties}>
                <Die pips={secret ? 7 : face + 1} />
              </span>
            </button>
            {loadState === 'error' && <span className="mood-error">That mood did not load. Try again.</span>}
          </div>
        </div>
        {children}
      </section>
      {/* On screen the footer only shows with the colophon; in print it
          always carries the contact line at the foot of the sheet. */}
      <footer className="letterhead-footer" data-colophon={showColophon ? '' : undefined}>
        {showColophon && (
          <>
            <p className="colophon">
              <span className="colophon-number">{number ? `No. ${number} of ${listed}.` : 'Lab preview.'}</span>{' '}
              {secret ? 'Gold foil on black.' : `${describeMood(design)}.`}
            </p>
            <p className="colophon-progress">
              {progress}
              <span className="keyboard-hint"> Space shuffles. Shift + Space goes back.</span>
            </p>
          </>
        )}
        <p className="print-only">{site.legalName} · {site.email} · {site.url.replace('https://', '')}</p>
      </footer>
      <span id="shuffle-hint" className="sr-only">
        Tap the name or roll the die for another of {listed} moods. Space does the same, and Shift + Space goes back.
      </span>
      <span className="sr-only" role="status" aria-label="Mood" aria-live="polite">{announcement}</span>
      {StyleLab && <StyleLab controller={{ selectedFontName, loadState, style: design.style, selectFont, resetDesign }} />}
    </>
  );
}

// A new sheet spreads from the press as a growing circle. Every point on
// screen shows either the whole old page or the whole new one, so the ink
// always keeps its contrast. Without View Transitions the paper just swaps.
function spreadPaper(commit: () => void, { x, y }: { x: number; y: number }) {
  const transition = document.startViewTransition(() => flushSync(commit));
  transition.ready.then(() => {
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    try {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: 'cubic-bezier(.3,.7,.2,1)', pseudoElement: '::view-transition-new(root)' },
      );
    } catch {
      // A browser that cannot animate the new page just shows it.
    }
  }, () => undefined);
  return transition;
}

function applyAttributes({ style }: DesignSnapshot) {
  const root = document.documentElement;
  root.dataset.palette = String(style.palette);
  root.dataset.surface = String(style.surface);
  root.dataset.tracking = String(style.tracking);
}
