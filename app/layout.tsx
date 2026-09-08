import './globals.css';
import type { Metadata, Viewport } from 'next';
import { bodyFont } from './fonts';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.legalName,
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bodyFont.className}>
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}
