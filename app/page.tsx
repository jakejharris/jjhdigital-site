import type { Metadata } from 'next';
import { displayFont } from './fonts';
import EmailCopy from '@/components/EmailCopy';
import Wordmark from '@/components/Wordmark';

export const metadata: Metadata = {
  title: 'JJH DIGITAL LLC',
  description:
    'JJH DIGITAL LLC designs and builds thoughtful digital products, websites, and software for modern businesses.',
  alternates: {
    canonical: 'https://jjhdigital.com',
  },
  openGraph: {
    title: 'JJH DIGITAL LLC',
    description:
      'Thoughtful digital products, websites, and software for modern businesses.',
    url: 'https://jjhdigital.com',
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <main
      className="flex min-h-[100dvh] overflow-x-clip px-6 py-6 transition-colors duration-300 sm:px-16 sm:py-16"
      style={{
        backgroundColor: 'var(--homepage-background, #ffffff)',
        backgroundImage: 'var(--homepage-surface-image, none)',
        backgroundSize: 'var(--homepage-surface-size, auto)',
        color: 'var(--homepage-ink, #0a0a0a)',
      }}
    >
      <section
        className="m-auto min-w-0 w-full max-w-5xl"
        aria-labelledby="company-name"
      >
        <Wordmark baseFontClassName={displayFont.className} />

        <div className="mt-6 max-w-[60ch] sm:mt-16">
          {/* 18px below 640px is the one documented mobile exception (DESIGN.md, Type). */}
          <p className="text-lg leading-[1.6] tracking-[-0.01em] transition-colors duration-300 [color:var(--homepage-body,#525252)] sm:text-base">
            JJH DIGITAL LLC designs and builds thoughtful digital products,
            websites, and software for modern businesses. We turn ambitious
            ideas into clear, capable experiences made to last.
          </p>

          <div className="mt-6">
            <EmailCopy email="jake@jjhdigital.com" />
          </div>
        </div>
      </section>
    </main>
  );
}
