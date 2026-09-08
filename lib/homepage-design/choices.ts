
export const homepagePalettes = [
  {
    name: 'White',
    background: '#ffffff',
    ink: '#0a0a0a',
    body: '#525252',
    quiet: '#a3a3a3',
    border: '#d4d4d4',
    soft: '#f2f2f2',
    accent: '#2563eb',
    grid: 'rgba(10, 10, 10, 0.055)',
  },
  {
    name: 'Paper',
    background: '#f2eee5',
    ink: '#251d16',
    body: '#665b50',
    quiet: '#a69b8f',
    border: '#cfc6b8',
    soft: '#e4dccf',
    accent: '#9a3d22',
    grid: 'rgba(37, 29, 22, 0.06)',
  },
  {
    name: 'Ice',
    background: '#edf4f7',
    ink: '#102a43',
    body: '#486581',
    quiet: '#829ab1',
    border: '#bcccdc',
    soft: '#d9e8ef',
    accent: '#0070f3',
    grid: 'rgba(16, 42, 67, 0.06)',
  },
  {
    name: 'Moss',
    background: '#e6ede3',
    ink: '#17351f',
    body: '#4f6856',
    quiet: '#879b8b',
    border: '#bdcbbb',
    soft: '#d4dfd1',
    accent: '#b24c2e',
    grid: 'rgba(23, 53, 31, 0.06)',
  },
  {
    name: 'Ink',
    background: '#101010',
    ink: '#f4f1e8',
    body: '#b9b5ac',
    quiet: '#73716c',
    border: '#3b3a37',
    soft: '#242321',
    accent: '#ff614d',
    grid: 'rgba(244, 241, 232, 0.065)',
  },
  {
    name: 'Klein',
    background: '#1434cb',
    ink: '#ffffff',
    body: '#d9e0ff',
    quiet: '#8fa2f7',
    border: '#6178e4',
    soft: '#2949d2',
    accent: '#ffdf4d',
    grid: 'rgba(255, 255, 255, 0.08)',
  },
] as const;

export const emailTreatments = [
  {
    name: 'Outline',
    background: 'var(--homepage-background)',
    color: 'var(--homepage-ink)',
    borderColor: 'var(--homepage-border)',
    borderWidth: '1px',
    radius: '999px',
    shadow: 'none',
    padding: '8px 24px',
    compactPadding: '0 8px',
    compactShadow: 'none',
    hoverBackground: 'var(--homepage-ink)',
    hoverColor: 'var(--homepage-background)',
  },
  {
    name: 'Solid',
    background: 'var(--homepage-ink)',
    color: 'var(--homepage-background)',
    borderColor: 'var(--homepage-ink)',
    borderWidth: '1px',
    radius: '999px',
    shadow: 'none',
    padding: '8px 24px',
    compactPadding: '0 8px',
    compactShadow: 'none',
    hoverBackground: 'var(--homepage-accent)',
    hoverColor: 'var(--homepage-background)',
  },
  {
    name: 'Soft',
    background: 'var(--homepage-soft)',
    color: 'var(--homepage-ink)',
    borderColor: 'transparent',
    borderWidth: '1px',
    radius: '0.75rem',
    shadow: 'none',
    padding: '8px 24px',
    compactPadding: '0 8px',
    compactShadow: 'none',
    hoverBackground: 'var(--homepage-border)',
    hoverColor: 'var(--homepage-ink)',
  },
  {
    name: 'Underline',
    background: 'transparent',
    color: 'var(--homepage-ink)',
    borderColor: 'var(--homepage-ink)',
    borderWidth: '0 0 1px 0',
    radius: '0',
    shadow: 'none',
    padding: '8px 0',
    compactPadding: '0 0',
    compactShadow: 'none',
    hoverBackground: 'transparent',
    hoverColor: 'var(--homepage-accent)',
  },
  {
    name: 'Stamp',
    background: 'var(--homepage-background)',
    color: 'var(--homepage-ink)',
    borderColor: 'var(--homepage-ink)',
    borderWidth: '2px',
    radius: '0',
    shadow: '4px 4px 0 var(--homepage-accent)',
    padding: '8px 24px',
    compactPadding: '0 8px',
    compactShadow: '3px 3px 0 var(--homepage-accent)',
    hoverBackground: 'var(--homepage-accent)',
    hoverColor: 'var(--homepage-ink)',
  },
] as const;

export const llcTreatments = [
  { name: 'Quiet', color: 'var(--homepage-quiet)', opacity: '1', stroke: '0 transparent' },
  { name: 'Ink', color: 'var(--homepage-ink)', opacity: '0.9', stroke: '0 transparent' },
  { name: 'Accent', color: 'var(--homepage-accent)', opacity: '1', stroke: '0 transparent' },
  { name: 'Outline', color: 'transparent', opacity: '1', stroke: '1px var(--homepage-ink)' },
  { name: 'Ghost', color: 'var(--homepage-body)', opacity: '0.38', stroke: '0 transparent' },
] as const;

export const iconTreatments = ['Copy', 'Mail', 'At', 'Arrow', 'Clipboard', 'None'] as const;

export const wordmarkTracking = [
  { name: 'Tight', value: '-0.055em' },
  { name: 'Tailored', value: '-0.035em' },
  { name: 'Natural', value: '-0.015em' },
  { name: 'Open', value: '0.005em' },
] as const;

export const surfaceTreatments = [
  { name: 'Plain', image: 'none', size: 'auto' },
  {
    name: 'Glow',
    image: 'radial-gradient(circle at 78% 18%, var(--homepage-soft) 0, transparent 42%)',
    size: 'auto',
  },
  {
    name: 'Grid',
    image: 'linear-gradient(var(--homepage-grid) 1px, transparent 1px), linear-gradient(90deg, var(--homepage-grid) 1px, transparent 1px)',
    size: '48px 48px',
  },
] as const;

export type HomepageStyleSelection = {
  palette: number;
  email: number;
  llc: number;
  icon: number;
  tracking: number;
  surface: number;
};

export const defaultHomepageStyle: HomepageStyleSelection = {
  palette: 0,
  email: 0,
  llc: 0,
  icon: 0,
  tracking: 1,
  surface: 0,
};

function differentIndex(length: number, current: number) {
  if (length < 2) return current;
  const offset = Math.floor(Math.random() * (length - 1)) + 1;
  return (current + offset) % length;
}

// The shuffle only rolls concrete icons: the 'None' treatment strips the CTA's
// affordance icon, which reads as broken rather than minimal, so it stays a
// deliberate lab-only selection instead of a random outcome.
function differentIconIndex(current: number) {
  const candidates = iconTreatments
    .map((_, index) => index)
    .filter((index) => iconTreatments[index] !== 'None' && index !== current);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? current;
}

export function randomizeHomepageStyle(
  current: HomepageStyleSelection
): HomepageStyleSelection {
  return {
    palette: differentIndex(homepagePalettes.length, current.palette),
    email: differentIndex(emailTreatments.length, current.email),
    llc: differentIndex(llcTreatments.length, current.llc),
    icon: differentIconIndex(current.icon),
    tracking: differentIndex(wordmarkTracking.length, current.tracking),
    surface: differentIndex(surfaceTreatments.length, current.surface),
  };
}
