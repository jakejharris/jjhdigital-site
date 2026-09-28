import './globals.css';
import type { Metadata, Viewport } from 'next';
import { bodyFont } from './fonts';
import { moodStyles, prepaintScript } from '@/lib/homepage-design/prepaint';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.legalName,
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The pre-paint script marks <html> before React hydrates it.
    <html lang="en" className={bodyFont.className} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: moodStyles }} />
        <script dangerouslySetInnerHTML={{ __html: prepaintScript }} />
      </head>
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}
