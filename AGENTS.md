# JJH DIGITAL

JJH DIGITAL's home on the web is letterhead that turns out to be made of pixels. It says who we are, makes it easy to say hello, and re-sets the name in a new mood with every tap.

## Keep it public

- Treat every file, commit, issue, and screenshot as public. Use invented examples when examples are needed.
- Keep client work, account tools, credentials, private URLs, local machine paths, internal prompts, and runtime logs out of this repository. Environment examples must contain placeholders only.
- This repository owns the public site. Authentication, billing, databases, and operational tools belong elsewhere.
- Keep the homepage crawlable without JavaScript. Maintain the public identity in `lib/site.ts`, consistent search/share metadata, and structured data that matches the visible company and founder information. New public pages belong in the sitemap.
- A fresh clone must install and build without secrets or access to private services. Keep the default fonts local so builds do not fetch fonts.
- Add only assets whose redistribution terms are known. Keep licenses and attribution with third-party assets; do not assume a purchased asset can be published.
- The code uses MIT. Font licenses are separate. The JJH DIGITAL name and branding identify this site; forks should use their own identity.

## Keep it small and fun

- Read DESIGN.md before changing the interface. Keep the wordmark, breathing room, and easy contact at the center of the page.
- Shuffle changes the mood through type, color, and surface. Keep the layout steady and the default page useful before JavaScript loads.
- Motion is the content, never decoration: the name's own pixels, triggered by the visitor, with a reduced-motion path and the text as the source of truth.
- Keep developer controls out of production. Keep public copy about the company and the experience, with implementation details in documentation.
- Use semantic controls, visible keyboard focus, readable contrast, touch targets, and reduced-motion support. Check narrow screens and failed font or clipboard requests.
- Prefer removing complexity to adding a framework. Add a dependency only when it clearly earns its place.

## Work here

- Use Node 22 and npm; commit package-lock.json. Start with npm ci and npm run dev.
- app/ owns routes and metadata; components/ owns the letterhead toy, pixel drawing, contact action, and development lab; lib/homepage-design/ owns moods, the deck, shuffle history, and the first paint; lib/pixel-type.ts owns the pixel math.
- Keep the same two-sentence mission in this file and README.md. Keep the README at or below 1,000 characters.
- Before shipping code, run npm run typecheck, npm test, and npm run test:e2e. The last command builds and checks the production site at mobile and desktop sizes.
- Review npm audit --omit=dev and the staged diff before publishing. Explain observable changes and verification in commits and pull requests.
- Tests should protect useful behavior: a working first visit with and without scripts, shuffle/undo, the deck and shared links, contact, font failures, reduced motion, and the public/development boundary.
