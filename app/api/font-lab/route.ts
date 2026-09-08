import { NextRequest, NextResponse } from 'next/server';
import { fontLabCatalog } from '@/components/font-lab-catalog';

const previewText = 'JJH DIGITAL LLC';
const isDevelopment = process.env.NODE_ENV === 'development';

// The public wordmark uses bundled fonts. Only the development explorer
// needs access to the larger catalog.
const allowedFamilies = new Set(fontLabCatalog.map((font) => font.name));
const cacheControl = 'private, max-age=86400';

const fontHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
};

const fontUrlCache = new Map<string, Promise<string>>();
const fontFileCache = new Map<string, Promise<ArrayBuffer>>();

function googleStylesheetUrl(family: string) {
  const params = new URLSearchParams({
    family,
    text: previewText,
    display: 'swap',
  });

  return `https://fonts.googleapis.com/css2?${params.toString()}`;
}

function getGoogleFontUrl(family: string) {
  const cached = fontUrlCache.get(family);
  if (cached) return cached;

  const request = fetch(googleStylesheetUrl(family), {
    headers: fontHeaders,
    signal: AbortSignal.timeout(10_000),
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Google Fonts returned ${response.status}`);
    }

    const stylesheet = await response.text();
    const match = stylesheet.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!match) throw new Error('Google Fonts response did not include a font file');
    return match[1];
  });

  fontUrlCache.set(family, request);
  request.catch(() => fontUrlCache.delete(family));
  return request;
}

function getFontFile(family: string) {
  const cached = fontFileCache.get(family);
  if (cached) return cached;

  const request = getGoogleFontUrl(family)
    .then((url) => fetch(url, { headers: fontHeaders, signal: AbortSignal.timeout(10_000) }))
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Google Fonts file returned ${response.status}`);
      }
      return response.arrayBuffer();
    });

  fontFileCache.set(family, request);
  request.catch(() => fontFileCache.delete(family));
  return request;
}

export async function GET(request: NextRequest) {
  if (!isDevelopment) return new NextResponse(null, { status: 404 });
  const family = request.nextUrl.searchParams.get('family');
  const asset = request.nextUrl.searchParams.get('asset');

  if (!family || !allowedFamilies.has(family)) {
    return NextResponse.json({ error: 'Unknown font family' }, { status: 400 });
  }

  if (asset === 'css') {
    const fileUrl = new URL('/api/font-lab', request.url);
    fileUrl.searchParams.set('asset', 'font');
    fileUrl.searchParams.set('family', family);
    const escapedFamily = family.replaceAll('\\', '\\\\').replaceAll("'", "\\'");

    return new NextResponse(
      `@font-face{font-family:'${escapedFamily}';font-style:normal;font-weight:400;font-display:swap;src:url('${fileUrl.pathname}${fileUrl.search}') format('woff2');}`,
      {
        headers: {
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': cacheControl,
        },
      }
    );
  }

  if (asset === 'font') {
    try {
      const fontFile = await getFontFile(family);
      return new NextResponse(fontFile, {
        headers: {
          'Content-Type': 'font/woff2',
          'Cache-Control': cacheControl,
        },
      });
    } catch {
      return NextResponse.json({ error: 'Unable to load font' }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Unknown font asset' }, { status: 400 });
}
