import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'JJH DIGITAL LLC';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const font = await readFile(join(process.cwd(), 'app/fonts/cormorant-garamond.ttf'));

  return new ImageResponse(
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      width: '100%', height: '100%', padding: '88px',
      background: '#fff', color: '#0a0a0a', fontFamily: 'Cormorant',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 112 }}>
        JJH DIGITAL <span style={{ marginLeft: 24, fontSize: 42, color: '#737373' }}>LLC</span>
      </div>
      <div style={{ marginTop: 48, fontSize: 32, color: '#525252' }}>jake@jjhdigital.com</div>
    </div>,
    { ...size, fonts: [{ name: 'Cormorant', data: font, weight: 400, style: 'normal' }] }
  );
}
