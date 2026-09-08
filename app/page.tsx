import type { Metadata } from 'next';
import { displayFont } from './fonts';
import EmailCopy from '@/components/EmailCopy';
import Wordmark from '@/components/Wordmark';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  alternates: {
    canonical: site.url,
  },
  openGraph: {
    title: site.title,
    description: site.description,
    siteName: site.name,
    url: site.url,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${site.url}/#website`,
      name: site.name,
      alternateName: site.legalName,
      url: site.url,
      publisher: { '@id': `${site.url}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${site.url}/#organization`,
      name: site.name,
      legalName: site.legalName,
      alternateName: site.legalName,
      url: site.url,
      description: site.description,
      email: site.email,
      founder: {
        '@type': 'Person',
        ...site.founder,
      },
    },
  ],
};

export default function HomePage() {
  return (
    <main className="letterhead">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
      <section className="letterhead-content" aria-labelledby="company-name">
        <Wordmark baseFontClassName={displayFont.className} />

        <div className="letterhead-note">
          {/* The body follows the 18px mobile / 16px desktop rule in DESIGN.md. */}
          <p>
            Founded by <a href={site.founder.url}>{site.founder.name}</a>,{' '}
            {site.legalName} designs and builds thoughtful digital products,
            websites, and software for modern businesses. We turn ambitious
            ideas into clear, capable experiences made to last.
          </p>

          <div className="letterhead-contact">
            <EmailCopy email={site.email} />
          </div>
        </div>
      </section>
    </main>
  );
}
