// Each mood is a complete piece of letterhead. Type, ink, tracking, and
// surface travel together; the contact action keeps the same meaning.
export const homepagePalettes = [
  { name: 'Ivory', background: '#f6f4ee', ink: '#292722', body: '#625e55', accent: '#963e2c', grid: 'transparent' },
  { name: 'Blueprint', background: '#1738cd', ink: '#ffffff', body: '#dce4ff', accent: '#f0e79b', grid: 'rgba(255,255,255,0.045)' },
  { name: 'Oxblood', background: '#f1e6dc', ink: '#682d35', body: '#79514e', accent: '#682d35', grid: 'transparent' },
  { name: 'Moss', background: '#e8ece3', ink: '#294336', body: '#566451', accent: '#294336', grid: 'transparent' },
  { name: 'Carbon', background: '#252522', ink: '#f0ecdf', body: '#c2beaf', accent: '#eabc79', grid: 'transparent' },
  { name: 'Signal', background: '#f3cf61', ink: '#322b1c', body: '#64502b', accent: '#7a351d', grid: 'transparent' },
] as const;

export const wordmarkTracking = [
  { name: 'Tailored', value: '-0.045em' },
  { name: 'Close', value: '-0.06em' },
  { name: 'Open', value: '0.015em' },
  { name: 'Natural', value: '-0.02em' },
] as const;
export const surfaceTreatments = [
  { name: 'Plain', image: 'none', size: 'auto' },
  {
    name: 'Drafting paper',
    image: 'linear-gradient(var(--homepage-grid) 1px, transparent 1px), linear-gradient(90deg, var(--homepage-grid) 1px, transparent 1px)',
    size: '64px 64px',
  },
] as const;

export type HomepageStyleSelection = {
  palette: number;
  tracking: number;
  surface: number;
};

export const defaultHomepageStyle: HomepageStyleSelection = {
  palette: 0, tracking: 0, surface: 0,
};

export const homepageMoods = [
  { name: 'Letterhead', fontName: 'Cormorant Garamond', style: defaultHomepageStyle },
  { name: 'Blueprint', fontName: 'Work Sans', style: { ...defaultHomepageStyle, palette: 1, tracking: 1, surface: 1 } },
  { name: 'Colophon', fontName: 'Gloock', style: { ...defaultHomepageStyle, palette: 2, tracking: 0 } },
  { name: 'Fieldwork', fontName: 'Unbounded', style: { ...defaultHomepageStyle, palette: 3, tracking: 1 } },
  { name: 'After hours', fontName: 'Monoton', style: { ...defaultHomepageStyle, palette: 4, tracking: 2 } },
  { name: 'Signal', fontName: 'Bebas Neue', style: { ...defaultHomepageStyle, palette: 5, tracking: 2 } },
] as const;

// A draw can reach every other composition, including the first one. Passing
// the random source makes the complete tour reproducible in browser checks.
export function nextHomepageMood(currentFontName: string, random = Math.random) {
  const current = homepageMoods.findIndex((mood) => mood.fontName === currentFontName);
  const offset = Math.floor(random() * (homepageMoods.length - (current < 0 ? 0 : 1))) + 1;
  return homepageMoods[(current + offset) % homepageMoods.length];
}
