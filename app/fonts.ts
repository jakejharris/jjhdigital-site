import localFont from 'next/font/local';

export const displayFont = localFont({
  src: './fonts/cormorant-garamond-latin-wght-normal.woff2',
  weight: '300 700',
  adjustFontFallback: 'Times New Roman',
  display: 'swap',
});

export const bodyFont = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
});
