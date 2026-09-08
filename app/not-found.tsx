import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center px-6 py-6 sm:px-16 sm:py-16">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="font-serif text-5xl">A little too much empty space.</h1>
        <p className="mt-6 text-base leading-relaxed">There is no page here.</p>
        <Link href="/" className="mt-6 inline-block underline underline-offset-4">Back to JJH DIGITAL</Link>
      </div>
    </main>
  );
}
