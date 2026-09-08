# Design Doctrine

JJH DIGITAL is a holding company. The site is letterhead, not a product.
The emptiness is the design.

Scope: the public site; developer controls are exempt. The shuffle is
the one flourish: it changes color, type, and surface while the layout
stays put.

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
  1.6 leading, fine print 13px for metadata only.
- Flush left, ragged right. Never centered, never justified.
- Recede by color, not size: non-focal text steps down one ink.
- The one mobile exception: below 640px the body paragraph sets at 18px
  (still ≤ 60ch, 1.6 leading) and returns to 16px from 640px up. Nothing
  else changes size at any width.

## Color

- One paper, one ink, at most one accent per view.
- Anything that must be read clears 4.5:1; quieter inks are decoration.

## Restraint

- One focal element per viewport — on this site, the wordmark. All else
  recedes.
- When something feels off: remove before resizing, resize before adding.

Anchors: Vignelli poster, museum wall label, a book's front matter.
Never: dashboard density, SaaS landing page, cards.
