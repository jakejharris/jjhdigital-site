# Design Doctrine

JJH DIGITAL is a holding company. The site is letterhead, not a product.
The emptiness is the design.

Scope: the public site; developer controls are exempt. The shuffle is
the one flourish: it changes color, type, and surface while the layout
stays put. Six faces, twelve palettes, and three paper surfaces combine
into 216 moods. Each face keeps its own tracking, and each palette keeps
its background and readable inks together; colors never randomize independently.
The first visit always starts on the original ivory letterhead.

## Space

- Gap tiers, fixed ratio 1:3:8 — 8px inside a component, 24px between
  components, 64px between sections. No in-between values.
- Page margins are made of the section tier; excessive is correct.
- Group with gap alone. A border or background must carry meaning no gap
  can (a button is a control, not a card).
- Below 640px: only the section tier compresses (64 → 24); content fills
  the width minus margins. Component (24) and inside (8) tiers hold.

## Type

- Display type leads, with a small inline suffix for LLC; body is 16px
  at ≤ 60ch and 1.6 leading, and feedback uses 13px fine print.
- Flush left, ragged right. Never centered, never justified.
- Recede by color, not size: non-focal text steps down one ink.
- Below 640px the body paragraph sets at 18px (still ≤ 60ch, 1.6
  leading) and returns to 16px from 640px up.
- The wordmark is one line on desktop and two on phones: JJH / DIGITAL.
  Display type fits a reserved masthead; its footprint never pushes the
  paragraph or contact when the face changes. LLC sits immediately after
  DIGITAL on the same baseline, like a small period. It scales with the
  name at 0.24em (at least 13px) and shares its face, tracking, ink, and movement.

## Color

- One paper, one ink, at most one accent per view.
- Anything that must be read clears 4.5:1; quieter inks are decoration.
- Plain, drafting-grid, and dot paper share each palette's subtle texture
  ink. Readable colors also clear 4.5:1 over intersecting grid lines.

## Restraint

- One focal element per viewport — on this site, the wordmark. All else
  recedes.
- When something feels off: remove before resizing, resize before adding.

Anchors: Vignelli poster, museum wall label, a book's front matter.
Never: dashboard density, SaaS landing page, cards.

## Interaction

- A tap on the type or the single rotation icon draws another complete design.
  Space does the same; Shift + Space goes back. The icon has an accessible
  name and keyboard hint, with no visible shuffle label or second control.
- Every combination is reachable, with equal odds among the other 215.
  A shuffle cannot repeat the current combination. Undo restores the exact
  face, palette, and surface, including when two moods share a face.
- The rotation control sits at the upper right of the masthead, above the
  lettering, with clear space around its touch target. LLC ends the name
  at the lower right; it never moves onto a separate caption line.
- A new paper and its loaded face appear together. A failed font leaves
  the current composition intact. Public shuffle fonts are bundled.
- Presses have a small downward give; new type settles in once. No idle
  animation. Reduced motion removes movement, and papers change without
  color fades so their inks keep their contrast throughout.
- The rotation control winds up slightly on hover, compresses on press,
  and makes one turn with a soft settle on shuffle. Fast taps continue
  smoothly from the current rotation. Reduced motion removes these effects.
- The email always copies and always uses the copy symbol. Its underline
  is a quiet, familiar affordance; feedback reserves space, and a failed
  clipboard offers a working mail link.

The two-line mobile masthead keeps the name prominent on a phone. DIGITAL
and its LLC suffix stay together as one line. A single rotation control
keeps the one flourish available without adding more copy.
