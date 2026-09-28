# JJH DIGITAL

JJH DIGITAL's home on the web is letterhead that turns out to be made of pixels. It says who we are, makes it easy to say hello, and re-sets the name in a new mood with every tap.

## Play

Tap the name or roll the die. Space does the same, and Shift + Space goes back. There are 216 moods, with no repeats until you have seen them all. `/#147` opens No. 147. Try printing it.

## Run

Use Node 22 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No secrets needed.

## Tinker

The page lives in `app/page.tsx` and the toy in `components/Letterhead.tsx`; moods and pixel math live in `lib/`. Read `AGENTS.md` and `DESIGN.md` first.

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

Deploy: [DEPLOYMENT.md](DEPLOYMENT.md). MIT code, font credits in `THIRD_PARTY_NOTICES.md`. Forks: bring your own name, words, and personality.
