import './globals.css';
import type { Metadata, Viewport } from 'next';
import { bodyFont } from './fonts';

export const metadata: Metadata = {
  metadataBase: new URL('https://jjhdigital.com'),
  title: 'JJH DIGITAL LLC',
  description: 'Thoughtful digital products, websites, and software for modern businesses.',
  openGraph: {
    type: 'website',
    siteName: 'JJH DIGITAL LLC',
    title: 'JJH DIGITAL LLC',
    description: 'Thoughtful digital products, websites, and software for modern businesses.',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bodyFont.className}>
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}
