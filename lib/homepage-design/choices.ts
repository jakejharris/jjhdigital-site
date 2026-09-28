// Colors travel as complete palettes. Faces keep their own spacing, while
// palette and surface can mix freely without changing the letterhead's layout.
export const homepagePalettes = [
  { name: 'Ivory', background: '#f6f4ee', ink: '#292722', body: '#625e55', accent: '#963e2c', grid: 'rgba(41,39,34,0.06)' },
  { name: 'Blueprint', background: '#1738cd', ink: '#ffffff', body: '#dce4ff', accent: '#f0e79b', grid: 'rgba(255,255,255,0.045)' },
  { name: 'Oxblood', background: '#f1e6dc', ink: '#682d35', body: '#754d4a', accent: '#682d35', grid: 'rgba(104,45,53,0.06)' },
  { name: 'Moss', background: '#e8ece3', ink: '#294336', body: '#4b5947', accent: '#294336', grid: 'rgba(41,67,54,0.06)' },
  { name: 'Carbon', background: '#252522', ink: '#f0ecdf', body: '#c2beaf', accent: '#eabc79', grid: 'rgba(240,236,223,0.06)' },
  { name: 'Signal', background: '#f3cf61', ink: '#322b1c', body: '#5d4725', accent: '#7a351d', grid: 'rgba(50,43,28,0.06)' },
  { name: 'Midnight', background: '#171f36', ink: '#f2ebdc', body: '#c4c9d7', accent: '#f2c879', grid: 'rgba(242,235,220,0.06)' },
  { name: 'Lilac', background: '#e8dff3', ink: '#432b58', body: '#5f486b', accent: '#703160', grid: 'rgba(67,43,88,0.06)' },
  { name: 'Coral', background: '#f3a18b', ink: '#41261f', body: '#58312a', accent: '#5c261a', grid: 'rgba(65,38,31,0.06)' },
  { name: 'Terracotta', background: '#733e31', ink: '#fff0da', body: '#f4ddc7', accent: '#ffdc9a', grid: 'rgba(255,240,218,0.06)' },
  { name: 'Glacier', background: '#dceeed', ink: '#21494d', body: '#3f5b60', accent: '#275f67', grid: 'rgba(33,73,77,0.06)' },
  { name: 'Sand', background: '#ebd7b3', ink: '#473726', body: '#604a35', accent: '#70401f', grid: 'rgba(71,55,38,0.06)' },
] as const;

// The edition that is not on the list: gold foil on black. It follows the
// other twelve so a palette index can still name it.
export const foilPalette = {
  name: 'Foil', background: '#16140f', ink: '#e8c470', body: '#d8cfb9', accent: '#e8c470', grid: 'rgba(232,196,112,0.07)',
} as const;
export const allPalettes = [...homepagePalettes, foilPalette];
export type Palette = (typeof allPalettes)[number];

export const wordmarkTracking = [
  { name: 'Tailored', value: '-0.045em' },
  { name: 'Close', value: '-0.06em' },
  { name: 'Open', value: '0.015em' },
  { name: 'Natural', value: '-0.02em' },
] as const;
export const surfaceTreatments = [
  { name: 'Plain', paper: 'paper', image: 'none', size: 'auto' },
  {
    name: 'Drafting paper',
    paper: 'drafting paper',
    image: 'linear-gradient(var(--homepage-grid) 1px, transparent 1px), linear-gradient(90deg, var(--homepage-grid) 1px, transparent 1px)',
    size: '64px 64px',
  },
  {
    name: 'Dot paper',
    paper: 'dot paper',
    image: 'radial-gradient(circle, var(--homepage-grid) 1px, transparent 1px)',
    size: '24px 24px',
  },
] as const;

export type HomepageStyleSelection = {
  palette: number;
  tracking: number;
  surface: number;
};
export type DesignSnapshot = { fontName: string; style: HomepageStyleSelection };

export const defaultHomepageStyle: HomepageStyleSelection = {
  palette: 0, tracking: 0, surface: 0,
};

export const homepageTypefaces = [
  { fontName: 'Cormorant Garamond', tracking: 0 },
  { fontName: 'Work Sans', tracking: 1 },
  { fontName: 'Gloock', tracking: 0 },
  { fontName: 'Unbounded', tracking: 1 },
  { fontName: 'Monoton', tracking: 2 },
  { fontName: 'Bebas Neue', tracking: 2 },
] as const;

// 12 palettes × 3 surfaces × 6 faces = 216 editions, numbered from 1 in this
// order. No. 1 is the original ivory letterhead.
export const homepageMoods: DesignSnapshot[] = homepagePalettes.flatMap((_, palette) =>
  surfaceTreatments.flatMap((_, surface) =>
    homepageTypefaces.map(({ fontName, tracking }) => ({
      fontName, style: { palette, tracking, surface },
    }))
  )
);
export const secretMood: DesignSnapshot = {
  fontName: 'Cormorant Garamond',
  style: { palette: homepagePalettes.length, tracking: 0, surface: 0 },
};
export const secretNumber = homepageMoods.length + 1;

export function sameMood(a: DesignSnapshot, b: DesignSnapshot) {
  return a.fontName === b.fontName &&
    a.style.palette === b.style.palette &&
    a.style.tracking === b.style.tracking &&
    a.style.surface === b.style.surface;
}

// 1 to 216 for the listed editions, 217 for foil, undefined for a lab font.
export function moodNumber(snapshot: DesignSnapshot): number | undefined {
  if (sameMood(snapshot, secretMood)) return secretNumber;
  const index = homepageMoods.findIndex((mood) => sameMood(mood, snapshot));
  return index < 0 ? undefined : index + 1;
}
export function moodForNumber(number: number): DesignSnapshot | undefined {
  if (number === secretNumber) return secretMood;
  return Number.isInteger(number) ? homepageMoods[number - 1] : undefined;
}

// Accepts "#147" or "147"; anything else means no edition was asked for.
export function moodNumberFromHash(hash: string): number | undefined {
  const match = /^#?(\d{1,3})$/.exec(hash);
  const number = match ? Number(match[1]) : NaN;
  return moodForNumber(number) ? number : undefined;
}

export function describeMood(snapshot: DesignSnapshot) {
  const palette = allPalettes[snapshot.style.palette] ?? homepagePalettes[0];
  const surface = surfaceTreatments[snapshot.style.surface] ?? surfaceTreatments[0];
  return `${snapshot.fontName} on ${palette.name} ${surface.paper}`;
}

// The shuffle deals from a deck: every draw is an edition you have not seen
// this visit, with equal odds among them. Once all 216 are seen, the next draw
// is the foil edition, and after that the deck starts over. Candidates run in
// order from the current edition, so a random source of 0 walks the whole
// catalog, which keeps browser checks reproducible.
export function nextHomepageMood(
  snapshot: DesignSnapshot,
  seen: ReadonlySet<number>,
  random = Math.random,
): DesignSnapshot {
  const current = moodNumber(snapshot);
  const listed = homepageMoods.length;
  const allSeen = homepageMoods.every((_, index) => seen.has(index + 1));
  if (allSeen && current !== secretNumber) return secretMood;

  const start = current && current <= listed ? current : 0;
  const order = Array.from({ length: listed }, (_, offset) => (start + offset) % listed + 1)
    .filter((number) => number !== current);
  const unseen = allSeen ? order : order.filter((number) => !seen.has(number));
  const candidates = unseen.length ? unseen : order;
  return homepageMoods[candidates[Math.floor(random() * candidates.length)] - 1];
}
