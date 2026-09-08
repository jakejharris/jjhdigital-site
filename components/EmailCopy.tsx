'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, AtSign, Check, Clipboard, Copy, Mail } from 'lucide-react';

type EmailCopyProps = {
  email: string;
};

export default function EmailCopy({ email }: EmailCopyProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopyFailed(false);
      setCopied(true);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyEmail}
        className="homepage-email-button group inline-flex min-h-11 items-center gap-2 border text-base font-medium tracking-[-0.01em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--homepage-ink)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--homepage-background)] motion-safe:active:scale-[0.96] motion-safe:[transition:color_300ms_ease-out,background-color_300ms_ease-out,border-color_300ms_ease-out,transform_450ms_cubic-bezier(0.34,1.56,0.64,1)]"
        aria-label={`Copy ${email} to clipboard`}
      >
        <span>{email}</span>
        <span className="relative size-4" aria-hidden="true">
          <span
            className={`absolute inset-0 m-auto grid size-4 place-items-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:[transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
              copied ? 'scale-0 rotate-[15deg]' : 'scale-100 rotate-0'
            }`}
          >
            <Copy className="size-4 [display:var(--homepage-icon-copy,block)]" strokeWidth={1.75} />
            <Mail className="size-4 [display:var(--homepage-icon-mail,none)]" strokeWidth={1.75} />
            <AtSign className="size-4 [display:var(--homepage-icon-at,none)]" strokeWidth={1.75} />
            <ArrowUpRight className="size-4 [display:var(--homepage-icon-arrow,none)]" strokeWidth={1.75} />
            <Clipboard className="size-4 [display:var(--homepage-icon-clipboard,none)]" strokeWidth={1.75} />
          </span>
          <Check
            className={`absolute inset-0 m-auto size-4 motion-safe:transition-transform motion-safe:duration-300 motion-safe:delay-100 motion-safe:[transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
              copied ? 'scale-100 rotate-0' : 'scale-0 -rotate-[15deg]'
            }`}
            strokeWidth={1.75}
          />
        </span>
      </button>

      <span
        className={`text-[13px] [color:var(--homepage-body,#525252)] motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:[transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
          copied || copyFailed ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-1 scale-90 opacity-0'
        }`}
        role="status"
        aria-live="polite"
      >
        {copyFailed ? <a className="underline underline-offset-4" href={`mailto:${email}`}>Open your email app instead</a> : 'Copied to clipboard'}
      </span>
      <noscript><a href={`mailto:${email}`} className="underline">Send an email</a></noscript>
    </div>
  );
}
