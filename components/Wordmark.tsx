'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { fontLabCatalog, type FontLabFont } from '@/components/font-lab-catalog';
import {
  defaultFontName,
  fontFamily,
  likedFonts,
  loadedFontNames,
  loadWordmarkFont,
  nextLikedFontName,
  useIsomorphicLayoutEffect,
  type DesignSnapshot,
  type FontLoadState,
  type WordmarkController,
} from '@/components/wordmark-shared';
import {
  defaultHomepageStyle,
  emailTreatments,
  homepagePalettes,
  iconTreatments,
  llcTreatments,
  randomizeHomepageStyle,
  surfaceTreatments,
  wordmarkTracking,
} from '@/lib/homepage-design/choices';
import { createDesignHistory } from '@/lib/homepage-design/history';

type WordmarkProps = {
  baseFontClassName: string;
};

// The style lab (font browsing, choice chips, prev/next/reset) only exists in
// development. The condition is a build-time constant, so production bundles
// never reference the lab module and its chunk is never emitted.
const StyleLab =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@/components/StyleLab'), { ssr: false })
    : null;

// Dev-only latency instrumentation: time from input to the next painted frame
// (state updates flush before the following rAF callback runs).
function reportShuffleLatency() {
  if (process.env.NODE_ENV !== 'development') return;
  const start = performance.now();
  requestAnimationFrame(() => {
    console.debug(
      `[wordmark] shuffle → frame: ${(performance.now() - start).toFixed(1)}ms`
    );
  });
}

export default function Wordmark({ baseFontClassName }: WordmarkProps) {
  const [selectedFontName, setSelectedFontName] = useState(defaultFontName);
  const [appliedFontName, setAppliedFontName] = useState(defaultFontName);
  const [loadState, setLoadState] = useState<FontLoadState>('ready');
  const [homepageStyle, setHomepageStyle] = useState(defaultHomepageStyle);
  const lastSpaceChange = useRef(0);
  const wordmarkRef = useRef<HTMLButtonElement>(null);
  const selectedFontRef = useRef(defaultFontName);
  const homepageStyleRef = useRef(defaultHomepageStyle);
  const history = useRef(
    createDesignHistory<DesignSnapshot>({
      fontName: defaultFontName,
      style: defaultHomepageStyle,
    })
  );

  const appliedFont = fontLabCatalog.find((font) => font.name === appliedFontName)!;
  const palette = homepagePalettes[homepageStyle.palette];
  const emailTreatment = emailTreatments[homepageStyle.email];
  const llcTreatment = llcTreatments[homepageStyle.llc];
  const iconTreatment = iconTreatments[homepageStyle.icon];
  const trackingTreatment = wordmarkTracking[homepageStyle.tracking];
  const surfaceTreatment = surfaceTreatments[homepageStyle.surface];

  // Loads the selected font before applying it, so the wordmark never paints
  // in a half-loaded face. In production the selection is always a liked font.
  useEffect(() => {
    if (selectedFontName === defaultFontName) return;

    let active = true;
    loadWordmarkFont(selectedFontName)
      .then(() => {
        if (!active || selectedFontRef.current !== selectedFontName) return;
        setAppliedFontName(selectedFontName);
        setLoadState('ready');
      })
      .catch(() => {
        if (!active || selectedFontRef.current !== selectedFontName) return;
        setLoadState('error');
      });

    return () => {
      active = false;
    };
  }, [selectedFontName]);

  const selectFont = useCallback((font: FontLabFont) => {
    selectedFontRef.current = font.name;
    setSelectedFontName(font.name);

    if (font.name === defaultFontName) {
      setAppliedFontName(defaultFontName);
      setLoadState('ready');
      return;
    }

    setLoadState(loadedFontNames.has(font.name) ? 'ready' : 'loading');
  }, []);

  const applySnapshot = useCallback(
    (snapshot: DesignSnapshot) => {
      homepageStyleRef.current = snapshot.style;
      setHomepageStyle(snapshot.style);
      const font = fontLabCatalog.find((candidate) => candidate.name === snapshot.fontName)!;
      // Warm path: if the font is already loaded, apply it in this same state
      // batch so style + font land in one render/paint instead of a frame apart.
      if (font.name !== defaultFontName && loadedFontNames.has(font.name)) {
        setAppliedFontName(font.name);
      }
      selectFont(font);
    },
    [selectFont]
  );

  const shuffleDesign = useCallback(() => {
    const snapshot = history.current.push({
      fontName: nextLikedFontName(selectedFontRef.current),
      style: randomizeHomepageStyle(homepageStyleRef.current),
    });
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const showPreviousDesign = useCallback(() => {
    const snapshot = history.current.back();
    if (snapshot) applySnapshot(snapshot);
  }, [applySnapshot]);

  const resetDesign = useCallback(() => {
    applySnapshot(history.current.reset());
  }, [applySnapshot]);

  // Warm every liked font at mount (~13KB of text-subset woff2 in total) so a
  // shuffle never waits on the network.
  useEffect(() => {
    likedFonts.forEach((font) => void loadWordmarkFont(font.name).catch(() => undefined));
  }, []);

  // Every tap shuffles — no gesture disambiguation, no waiting. (Undo is a
  // desktop-only gesture: Shift + Space.)
  function handleWordmarkTap() {
    reportShuffleLatency();
    shuffleDesign();
  }

  // The wordmark must never wrap, so keep it inside the container: if the
  // active font + tracking render wider than the available width (small
  // screens, wide display fonts), scale the font-size down until it fits.
  // Layout effect: runs before paint so the adjusted size lands in the same
  // frame as the font/style swap.
  useIsomorphicLayoutEffect(() => {
    const el = wordmarkRef.current;
    const container = el?.parentElement;
    if (!el || !container) return;

    function fitToWidth() {
      el!.style.fontSize = '';
      const available = container!.clientWidth;
      if (available === 0) return;
      if (el!.scrollWidth > available) {
        const computed = parseFloat(getComputedStyle(el!).fontSize);
        const scaled = computed * (available / el!.scrollWidth) * 0.98;
        el!.style.fontSize = `${Math.max(scaled, 14)}px`;
      }
    }

    fitToWidth();
    const observer = new ResizeObserver(fitToWidth);
    observer.observe(container);
    void document.fonts?.ready.then(fitToWidth);
    return () => observer.disconnect();
  }, [appliedFontName, homepageStyle.tracking]);

  useEffect(() => {
    function handleSpacebar(event: KeyboardEvent) {
      if (
        event.code !== 'Space' ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, select, textarea, [contenteditable="true"]')) {
        return;
      }

      event.preventDefault();
      const now = Date.now();
      if (now - lastSpaceChange.current < 180) return;
      lastSpaceChange.current = now;

      reportShuffleLatency();

      if (event.shiftKey) {
        showPreviousDesign();
      } else {
        shuffleDesign();
      }
    }

    window.addEventListener('keydown', handleSpacebar);
    return () => window.removeEventListener('keydown', handleSpacebar);
  }, [showPreviousDesign, shuffleDesign]);

  const controller: WordmarkController = {
    selectedFontName,
    loadState,
    style: homepageStyle,
    selectFont,
    resetDesign,
  };

  return (
    <>
      <style>{`
          :root,
          body {
            background-color: var(--homepage-background);
          }
          :root {
            --homepage-background: ${palette.background};
            --homepage-ink: ${palette.ink};
            --homepage-body: ${palette.body};
            --homepage-quiet: ${palette.quiet};
            --homepage-border: ${palette.border};
            --homepage-soft: ${palette.soft};
            --homepage-accent: ${palette.accent};
            --homepage-grid: ${palette.grid};
            --homepage-surface-image: ${surfaceTreatment.image};
            --homepage-surface-size: ${surfaceTreatment.size};
            --homepage-wordmark-tracking: ${trackingTreatment.value};
            --homepage-llc-color: ${llcTreatment.color};
            --homepage-llc-opacity: ${llcTreatment.opacity};
            --homepage-llc-stroke: ${llcTreatment.stroke};
            --homepage-icon-copy: ${iconTreatment === 'Copy' ? 'block' : 'none'};
            --homepage-icon-mail: ${iconTreatment === 'Mail' ? 'block' : 'none'};
            --homepage-icon-at: ${iconTreatment === 'At' ? 'block' : 'none'};
            --homepage-icon-arrow: ${iconTreatment === 'Arrow' ? 'block' : 'none'};
            --homepage-icon-clipboard: ${iconTreatment === 'Clipboard' ? 'block' : 'none'};
          }
          .homepage-email-button {
            background: ${emailTreatment.background};
            color: ${emailTreatment.color};
            border-color: ${emailTreatment.borderColor};
            border-width: ${emailTreatment.borderWidth};
            border-style: solid;
            border-radius: ${emailTreatment.radius};
            box-shadow: ${emailTreatment.shadow};
            padding: ${emailTreatment.padding};
          }
          .homepage-email-button:hover {
            background: ${emailTreatment.hoverBackground};
            color: ${emailTreatment.hoverColor};
          }
          @media (max-width: 639px) {
            .homepage-email-button {
              padding: ${emailTreatment.compactPadding};
              box-shadow: ${emailTreatment.compactShadow};
            }
            ${
              // The filled Solid pill is the one treatment whose mass reads as
              // a badge at small widths; below sm it renders as its outline
              // equivalent (paint-only, structure untouched).
              emailTreatment.name === 'Solid'
                ? `.homepage-email-button {
              background: var(--homepage-background);
              color: var(--homepage-ink);
              border-color: var(--homepage-border);
            }
            .homepage-email-button:hover {
              background: var(--homepage-ink);
              color: var(--homepage-background);
            }`
                : ''
            }
          }
        `}</style>

      <h1 id="company-name" aria-label="JJH DIGITAL LLC">
        <button
          ref={wordmarkRef}
          type="button"
          aria-label="Shuffle the style"
          title="Tap or press Space to shuffle the style"
          onClick={handleWordmarkTap}
          onKeyDown={(event) => {
            if (event.code === 'Space' && event.shiftKey) {
              event.preventDefault();
              showPreviousDesign();
            }
          }}
          onKeyUp={(event) => {
            // Touch browsers can synthesize a click on release even after the
            // keydown was handled. Undo must not immediately shuffle again.
            if (event.code === 'Space' && event.shiftKey) event.preventDefault();
          }}
          className={`${baseFontClassName} cursor-pointer touch-manipulation select-none whitespace-nowrap text-[clamp(2.5rem,8.3vw,6.75rem)] font-normal leading-[0.82] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-current`}
          style={{
            color: 'var(--homepage-ink, #0a0a0a)',
            fontFamily: appliedFont.name !== defaultFontName
              ? fontFamily(appliedFont)
              : undefined,
            letterSpacing: 'var(--homepage-wordmark-tracking, -0.035em)',
          }}
        >
          JJH DIGITAL{' '}
          <span
            className="ml-[0.2em] text-[0.38em] tracking-[-0.01em]"
            style={{
              color: 'var(--homepage-llc-color, #a3a3a3)',
              opacity: 'var(--homepage-llc-opacity, 1)',
              WebkitTextStroke: 'var(--homepage-llc-stroke, 0 transparent)',
            }}
          >
            LLC
          </span>
        </button>
      </h1>

      {StyleLab && <StyleLab controller={controller} />}
    </>
  );
}
