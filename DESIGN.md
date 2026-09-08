# Design Doctrine

JJH DIGITAL is a holding company. The site is letterhead, not a product.
The emptiness is the design.

Scope: the public site; developer controls are exempt. The shuffle is
the one flourish: it changes color, type, and surface while the layout
stays put. Each draw is a composed mood, with its own face, tracking, and
paper; visual choices do not randomize independently.

## Space

- Gap tiers, fixed ratio 1:3:8 — 8px inside a component, 24px between
  components, 64px between sections. No in-between values.
- Page margins are made of the section tier; excessive is correct.
- Group with gap alone. A border or background must carry meaning no gap
  can (a button is a control, not a card).
- Below 640px: only the section tier compresses (64 → 24); content fills
  the width minus margins. Component (24) and inside (8) tiers hold.

## Type

- Exactly three sizes: display (the wordmark), body 16px at ≤ 60ch and
  1.6 leading, fine print 13px for the legal imprint and quiet interaction labels.
- Flush left, ragged right. Never centered, never justified.
- Recede by color, not size: non-focal text steps down one ink.
- Below 640px the body paragraph sets at 18px (still ≤ 60ch, 1.6
  leading) and returns to 16px from 640px up.
- The wordmark is one line on desktop and two on phones: JJH / DIGITAL.
  Display type fits a reserved masthead; its footprint never pushes the
  paragraph or contact when the face changes. The legal LLC is a 13px
  imprint below it, keeping the name large and the suffix legible.

## Color

- One paper, one ink, at most one accent per view.
- Anything that must be read clears 4.5:1; quieter inks are decoration.

## Restraint

- One focal element per viewport — on this site, the wordmark. All else
  recedes.
- When something feels off: remove before resizing, resize before adding.

Anchors: Vignelli poster, museum wall label, a book's front matter.
Never: dashboard density, SaaS landing page, cards.

## Interaction

- A tap on the type or Change the mood draws another complete design.
  Space does the same; Shift + Space and the small undo control go back.
- A new paper and its loaded face appear together. A failed font leaves
  the current composition intact. Public shuffle fonts are bundled.
- Presses have a small downward give; new type settles in once. No idle
  animation. Reduced motion removes movement, and papers change without
  color fades so their inks keep their contrast throughout.
- The email always copies and always uses the copy symbol. Its underline
  is a quiet, familiar affordance; feedback reserves space, and a failed
  clipboard offers a working mail link.

The mobile masthead and separate legal imprint deliberately replace the
small single-line lockup: the name should remain the focal point on a
phone. The quiet shuffle label makes the one flourish discoverable; undo
lets a touch visitor keep a mood they liked. Neither adds a new section.
