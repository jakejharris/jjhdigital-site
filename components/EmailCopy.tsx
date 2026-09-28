'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function EmailCopy({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  async function copyEmail() {
    clearTimeout(timeout.current);
    try {
      await navigator.clipboard.writeText(email);
      setState('copied');
      timeout.current = setTimeout(() => setState('idle'), 2400);
    } catch {
      setState('failed');
    }
  }

  return (
    <div>
      <div className="email-copy-control">
        <button type="button" className="homepage-email-button" data-copied={state === 'copied'} onClick={copyEmail} aria-label={`Copy ${email} to clipboard`}>
          <span>{email}</span>
          <span className="email-icon" aria-hidden="true">
            <Copy className="copy-glyph" size={16} strokeWidth={1.5} />
            <Check className="copy-check" size={16} strokeWidth={1.5} />
          </span>
        </button>
        <div className="email-feedback" role="status" aria-label="Contact" aria-live="polite">
          {state === 'copied' ? 'Copied to clipboard' : state === 'failed' ? <a href={`mailto:${email}`}>Open your email app instead</a> : ''}
        </div>
      </div>
      <noscript>
        <style>{'.email-copy-control { display: none; } .mood-controls { visibility: hidden; }'}</style>
        <a href={`mailto:${email}`} className="homepage-email-button" aria-label="Send an email">{email}</a>
      </noscript>
    </div>
  );
}
