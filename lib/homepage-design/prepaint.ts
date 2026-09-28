import {
  allPalettes, foilPalette, homepagePalettes, homepageTypefaces, secretMood, secretNumber,
  surfaceTreatments, wordmarkTracking, type Palette,
} from './choices';

// Every edition is three attributes on <html>. The styles below turn them into
// the letterhead's colors, paper, and tracking, so the server, the first paint,
// and every later shuffle share one source of truth.
function paletteVariables(palette: Palette) {
  return [
    `--homepage-background:${palette.background}`,
    `--homepage-ink:${palette.ink}`,
    `--homepage-body:${palette.body}`,
    `--homepage-accent:${palette.accent}`,
    `--homepage-grid:${palette.grid}`,
  ].join(';');
}

function luminance(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return r * .2126 + g * .7152 + b * .0722;
}

// Printers bring their own white paper. A dark palette prints in its paper
// color instead of its pale ink. Foil keeps its gold name and sets the fine
// print in bronze, which reads on white.
export function printInk(palette: Palette) {
  if (palette === foilPalette) return '#7a5a1c';
  return luminance(palette.background) < luminance(palette.ink) ? palette.background : palette.ink;
}

export const moodStyles = [
  `:root{${paletteVariables(homepagePalettes[0])};--homepage-surface-image:none;--homepage-surface-size:auto;--homepage-wordmark-tracking:${wordmarkTracking[0].value}}`,
  ...allPalettes.map((palette, index) => `:root[data-palette="${index}"]{${paletteVariables(palette)}}`),
  ...surfaceTreatments.map((surface, index) =>
    `:root[data-surface="${index}"]{--homepage-surface-image:${surface.image};--homepage-surface-size:${surface.size}}`),
  ...wordmarkTracking.map((tracking, index) => `:root[data-tracking="${index}"]{--homepage-wordmark-tracking:${tracking.value}}`),
  `@media print{${allPalettes.map((palette, index) =>
    `${index ? '' : ':root,'}:root[data-palette="${index}"]{--homepage-ink:${printInk(palette)};--homepage-body:${printInk(palette)}}`).join('')}}`,
].join('\n');

const faces = homepageTypefaces.length;
const perPalette = faces * surfaceTreatments.length;

// Mirrors the numbering in choices.ts: palette, then paper, then face.
export function moodAttributes(number: number) {
  if (number === secretNumber) {
    const { palette, surface, tracking } = secretMood.style;
    return { palette, surface, tracking };
  }
  const index = number - 1;
  return {
    palette: Math.floor(index / perPalette),
    surface: Math.floor((index % perPalette) / faces),
    tracking: homepageTypefaces[index % faces].tracking,
  };
}

// Runs in <head> before anything paints. A shared link such as #147 opens on
// its own paper instead of flashing the ivory one first, and unless motion is
// reduced the name waits to arrive as pixels. If scripts never run, the
// letterhead is simply there.
export const prepaintScript = `(function(){try{
var d=document.documentElement,m=/^#(\\d{1,3})$/.exec(location.hash),n=m?+m[1]:0;
var t=${JSON.stringify(homepageTypefaces.map((face) => face.tracking))};
if(n===${secretNumber}){d.setAttribute('data-palette','${secretMood.style.palette}');d.setAttribute('data-surface','${secretMood.style.surface}');d.setAttribute('data-tracking','${secretMood.style.tracking}');}
else if(n>=1&&n<${secretNumber}){var i=n-1;d.setAttribute('data-palette',String(Math.floor(i/${perPalette})));d.setAttribute('data-surface',String(Math.floor(i%${perPalette}/${faces})));d.setAttribute('data-tracking',String(t[i%${faces}]));}
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('intro');
}catch(e){}})();`;
