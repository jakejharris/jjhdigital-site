# Deployment

The public site runs on Vercel from this repository's `main` branch. Pull
requests get preview deployments; merge passing changes to release them.
The canonical address is https://jjhdigital.com. The www address redirects
to it.

Use the Next.js preset, repository root, Node 22, `npm ci` to install, and
`npm run build` to build. Keep the default Next.js output directory. This
site needs no environment variables, database, or third-party accounts at
runtime. The font explorer and its remote font endpoint are development-only.

## Local production check

```sh
npm ci
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

The browser suite builds and serves production on port 3100. It checks the
masthead at phone and desktop widths, shuffle and undo, contact, missing
fonts, reduced motion, and the development boundary. CI runs these checks
and audits production dependencies. Failed browser checks retain artifacts
for seven days.

## Vercel CLI

Use a current Vercel CLI and sign in to your own account. Link the checkout
to the intended project before deploying; `.vercel/` is local state and
must stay ignored. Forks should create their own project and replace the
branding and canonical URLs before attaching their own domain.

```sh
npx vercel@latest link
npx vercel@latest git connect
npx vercel@latest deploy
```

For a manual release, build a production deployment without moving domains,
inspect its URL, then promote that exact deployment:

```sh
npx vercel@latest deploy --prod --skip-domain
npx vercel@latest inspect <deployment-url>
npx vercel@latest promote <deployment-url>
```

Check the live homepage, shuffle, email copy, favicon, `/robots.txt`,
`/sitemap.xml`, and `/opengraph-image`. The style lab and `/api/font-lab`
must not be available in production. Confirm www redirects to the canonical
address. Before a manual release, record the previous production URL; use
`npx vercel@latest rollback <previous-production-url>` if the release fails.
