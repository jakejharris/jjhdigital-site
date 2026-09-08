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
    <main className="letterhead">
      <section className="letterhead-content" aria-labelledby="company-name">
        <Wordmark baseFontClassName={displayFont.className} />

        <div className="letterhead-note">
          {/* The body follows the 18px mobile / 16px desktop rule in DESIGN.md. */}
          <p>
            JJH DIGITAL LLC designs and builds thoughtful digital products,
            websites, and software for modern businesses. We turn ambitious
            ideas into clear, capable experiences made to last.
          </p>

          <div className="letterhead-contact">
            <EmailCopy email="jake@jjhdigital.com" />
          </div>
        </div>
      </section>
    </main>
  );
}
