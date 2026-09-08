import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { site } from '@/lib/site';
import { homepagePalettes } from '@/lib/homepage-design/choices';

export const alt = `${site.legalName} | ${site.founder.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const [displayFont, bodyFont] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/cormorant-garamond.ttf')),
    readFile(join(process.cwd(), 'app/fonts/inter-regular.ttf')),
  ]);
  const palette = homepagePalettes[4]; // Carbon keeps the share card dark in every mood.

  return new ImageResponse(
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      width: '100%', height: '100%', padding: 64,
      background: palette.background, color: palette.ink, fontFamily: 'Cormorant',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 180, letterSpacing: '-0.045em', lineHeight: 1 }}>
        {site.name}
        {/* The image renderer needs an optical correction for the smaller type's baseline. */}
        <span style={{ marginLeft: 16, fontSize: 44, transform: 'translateY(-25px)' }}>LLC</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 64, fontFamily: 'Inter', fontSize: 28, color: palette.body }}>
        <span>{site.founder.name}</span>
        <span>jjhdigital.com</span>
      </div>
    </div>,
    { ...size, fonts: [
      { name: 'Cormorant', data: displayFont, weight: 400, style: 'normal' },
      { name: 'Inter', data: bodyFont, weight: 400, style: 'normal' },
    ] }
  );
}
