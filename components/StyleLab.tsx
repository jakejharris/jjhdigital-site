'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw } from 'lucide-react';
import { fontLabCatalog, type FontLabCategory } from '@/components/font-lab-catalog';
import {
  defaultFontName,
  fontFamily,
  isLikedFontName,
  likedFonts,
  loadWordmarkFont,
  useIsomorphicLayoutEffect,
  type WordmarkController,
} from '@/components/wordmark-shared';
import {
  emailTreatments,
  homepagePalettes,
  iconTreatments,
  llcTreatments,
  surfaceTreatments,
} from '@/lib/homepage-design/choices';

// Development-only style explorer: browses the full font catalog through the
// same-origin proxy, shows the current shuffle choices, and steps fonts with
// the wheel or buttons. Loaded by the wordmark through next/dynamic only when
// NODE_ENV is development; never part of a production bundle.

type StyleLabProps = {
  controller: WordmarkController;
};

type FontFilter = 'All' | 'Liked' | FontLabCategory;

const labCollapsedStorageKey = 'jjh:font-lab-collapsed';
const categories: FontFilter[] = [
  'All',
  'Liked',
  'Serif',
  'Sans',
  'Display',
  'Mono',
  'Script',
];

function fontsFor(filter: FontFilter) {
  if (filter === 'All') return fontLabCatalog;
  if (filter === 'Liked') return likedFonts;
  return fontLabCatalog.filter((font) => font.category === filter);
}

export default function StyleLab({ controller }: StyleLabProps) {
  const { selectedFontName, loadState, style, selectFont, resetDesign } = controller;
  const [filter, setFilter] = useState<FontFilter>('All');
  const [labCollapsed, setLabCollapsed] = useState(false);
  const lastWheelChange = useRef(0);

  // A shuffle (or reset) can select a font outside the current filter; show
  // the list that contains it rather than a stale index.
  const filterShowsSelection = fontsFor(filter).some((font) => font.name === selectedFontName);
  const effectiveFilter: FontFilter = filterShowsSelection
    ? filter
    : isLikedFontName(selectedFontName)
      ? 'Liked'
      : 'All';
  const visibleFonts = useMemo(() => fontsFor(effectiveFilter), [effectiveFilter]);
  const selectedIndex = Math.max(
    0,
    visibleFonts.findIndex((font) => font.name === selectedFontName)
  );
  const selectedFont = visibleFonts[selectedIndex];

  const palette = homepagePalettes[style.palette];
  const emailTreatment = emailTreatments[style.email];
  const llcTreatment = llcTreatments[style.llc];
  const iconTreatment = iconTreatments[style.icon];
  const surfaceTreatment = surfaceTreatments[style.surface];

  // Prefetch the fonts on either side of the selection so wheel browsing
  // never waits on the network.
  useEffect(() => {
    const neighbors = [-2, -1, 1, 2]
      .map((offset) => visibleFonts[(selectedIndex + offset + visibleFonts.length) % visibleFonts.length])
      .filter((font) => font.name !== defaultFontName);
    neighbors.forEach((font) => void loadWordmarkFont(font.name).catch(() => undefined));
  }, [selectedIndex, visibleFonts]);

  // Restore the lab's collapsed state before first paint (no expand flash on
  // reload); persistence failures fall back to expanded.
  useIsomorphicLayoutEffect(() => {
    try {
      setLabCollapsed(window.localStorage.getItem(labCollapsedStorageKey) === '1');
    } catch {
      // localStorage unavailable — stay expanded
    }
  }, []);

  const setLabCollapsedPersist = useCallback((collapsed: boolean) => {
    setLabCollapsed(collapsed);
    try {
      window.localStorage.setItem(labCollapsedStorageKey, collapsed ? '1' : '0');
    } catch {
      // ignore persistence failures
    }
  }, []);

  function moveFont(direction: -1 | 1) {
    const nextIndex = (selectedIndex + direction + visibleFonts.length) % visibleFonts.length;
    selectFont(visibleFonts[nextIndex]);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaY) < 2) return;

    event.preventDefault();
    const now = Date.now();
    if (now - lastWheelChange.current < 140) return;

    lastWheelChange.current = now;
    moveFont(event.deltaY > 0 ? 1 : -1);
  }

  function changeFilter(nextFilter: FontFilter) {
    setFilter(nextFilter);
    selectFont(fontsFor(nextFilter)[0]);
  }

  if (labCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setLabCollapsedPersist(false)}
        className="fixed bottom-4 right-4 z-[100] grid size-8 place-items-center rounded-full border border-neutral-200 bg-white/95 text-neutral-400 shadow-[0_6px_20px_rgba(0,0,0,0.1)] backdrop-blur transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
        aria-label="Open style lab"
        title="Open style lab"
      >
        <ChevronUp className="size-3.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      onWheel={handleWheel}
      className="fixed bottom-4 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))] select-none rounded-2xl border border-neutral-200 bg-white/95 p-3 text-neutral-950 shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur"
      aria-label="Local style explorer"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Local style lab
          </span>
          <span
            className={`size-1.5 rounded-full ${
              loadState === 'ready'
                ? 'bg-emerald-500'
                : loadState === 'loading'
                  ? 'animate-pulse bg-amber-400'
                  : 'bg-red-500'
            }`}
            title={loadState === 'ready' ? 'Font ready' : loadState === 'loading' ? 'Loading font' : 'Font failed to load'}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] tabular-nums text-neutral-400">
            {selectedIndex + 1} / {visibleFonts.length}
          </span>
          <button
            type="button"
            onClick={() => setLabCollapsedPersist(true)}
            className="grid size-6 shrink-0 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            aria-label="Minimize style lab"
            title="Minimize — Space / tap shuffle keeps working"
          >
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1 px-1" aria-label="Current style choices">
        {[
          { key: 'palette', label: palette.name },
          { key: 'email', label: emailTreatment.name },
          { key: 'llc', label: llcTreatment.name },
          { key: 'icon', label: iconTreatment },
          { key: 'surface', label: surfaceTreatment.name },
        ].map((choice) => (
          <span
            key={choice.key}
            className="rounded-full border border-neutral-200 px-2 py-0.5 text-[9px] text-neutral-500"
          >
            {choice.label}
          </span>
        ))}
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => changeFilter(category)}
            className={`rounded-full px-2.5 py-1 text-[10px] transition-colors ${
              effectiveFilter === category
                ? 'bg-neutral-950 text-white'
                : 'bg-neutral-100 text-neutral-500 hover:text-neutral-950'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => moveFont(-1)}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-neutral-200 transition-colors hover:border-neutral-950 hover:bg-neutral-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
          aria-label="Previous font"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p
            className="truncate text-base leading-tight"
            style={loadState === 'ready' && selectedFont.name !== defaultFontName
              ? { fontFamily: fontFamily(selectedFont) }
              : undefined}
          >
            {selectedFont.name}
          </p>
          <p className="mt-1 text-[10px] text-neutral-400">
            {loadState === 'loading'
              ? 'Loading before preview…'
              : loadState === 'error'
                ? 'Could not load this font'
                : effectiveFilter === 'Liked'
                  ? 'Liked · wheel browses fonts'
                  : `${selectedFont.category} · wheel browses fonts`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => moveFont(1)}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-neutral-200 transition-colors hover:border-neutral-950 hover:bg-neutral-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
          aria-label="Next font"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={resetDesign}
          className="grid size-9 shrink-0 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
          aria-label="Reset font"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-2 text-center text-[9px] uppercase tracking-[0.12em] text-neutral-400">
        Space / tap wordmark shuffles · Shift + Space goes back
      </p>
    </div>
  );
}
