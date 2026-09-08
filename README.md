# JJH DIGITAL

JJH DIGITAL's home on the web is a quiet piece of letterhead with a playful streak. It says who we are, makes it easy to say hello, and lets a tap change the mood.

Big type. Plenty of air. Six moods.

## Play

Tap the wordmark or press Space to shuffle. Shift + Space or the undo arrow goes back. Tap the email to copy it. The style lab appears only in development.

## Run

Use Node 22 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No accounts, keys, or database needed.

## Tinker

The page lives in `app/page.tsx`; the mood lives in `lib/homepage-design/`. Read `AGENTS.md` and `DESIGN.md` before moving the furniture.

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

`npm run build` and `npm start` serve the production site. All public fonts are bundled. Only the development lab uses Google Fonts.

MIT code. Font credits in `THIRD_PARTY_NOTICES.md`. Forks: bring your own name, words, and personality.
