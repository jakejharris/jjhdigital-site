import Link from 'next/link';
import { displayFont } from './fonts';

export default function NotFound() {
  return (
    <main className="letterhead">
      <section className="letterhead-content">
        <h1 className={`not-found-title ${displayFont.className}`}>This sheet is blank.</h1>
        <div className="letterhead-note">
          <p>There is no page at this address.</p>
          <p className="not-found-link"><Link href="/">Back to JJH DIGITAL</Link></p>
        </div>
      </section>
    </main>
  );
}
