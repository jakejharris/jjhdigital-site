# Design Doctrine

JJH DIGITAL looks like letterhead and turns out to be made of pixels. The page
is calm, classic, and easy to read. The name is the toy: poke it and it breaks
into pixels, re-sets itself in a new face on new paper, and settles back into
crisp type. Paper outside, pixels inside.

Scope: the public site. Developer controls are exempt.

## Space

- Gap tiers, fixed ratio 1:3:8: 8px inside a component, 24px between
  components, 64px between sections. No in-between values.
- Page margins are made of the section tier; excessive is correct.
- Group with gap alone. A border or background must carry meaning no gap
  can. A button is a control, not a card. The footer rule is letterhead's
  own line between the page and its fine print.
- Below 640px only the section tier compresses (64 → 24); content fills
  the width minus margins. Component (24) and inside (8) tiers hold.

## Type

- Display type leads, with a small inline LLC; body is 16px at ≤ 60ch
  and 1.6 leading, and fine print is 13px.
- Flush left, ragged right. Never centered, never justified.
- Recede by color, not size: non-focal text steps down one ink.
- Below 640px the body sets at 18px and returns to 16px from 640px up.
- The name is one line on desktop and two on phones: JJH / DIGITAL. It fits
  a reserved masthead, so a wider face never pushes the paragraph or contact.
  LLC sits right after DIGITAL on the same baseline, like a small period, at
  0.24em (at least 13px), sharing the face, tracking, ink, and movement.

## Color

- One paper, one ink, at most one accent per view.
- Anything that must be read clears 4.5:1, over grid lines too.
- Plain, drafting, and dot paper share each palette's quiet grid ink.
- Colors travel as whole palettes; they never randomize one at a time.

## The name is the toy

- Six faces, twelve palettes, and three papers make 216 numbered moods.
  No. 1 is the original ivory letterhead, and a visit starts there unless a
  link names another. `/#147` opens No. 147, and the address follows along.
- The shuffle deals from a deck: no mood repeats until all 216 have been
  seen in one visit. Then comes No. 217 of 216, gold foil on black, the one
  that is not on the list. Nothing is stored between visits.
- Tap the name or roll the die. Space does the same; Shift + Space goes
  back through the exact moods you saw.
- The die has six faces for six typefaces and shows the one you are on.
  Foil gets seven pips, which no real die has.
- The die is a 44px control at the upper right of the masthead with an
  accessible name and keyboard hint. There is no second control.
- The footer is the colophon: the mood's number, face, and paper, and how
  many you have seen. Printing the page gives real letterhead: the name at
  the top, the fine print at the foot, and room to write.

## Motion

Motion is the content, never the wallpaper. Nothing moves on its own except
the name's one print pass on arrival.

- Arrival: the name prints left to right, letter by letter, like a
  dot-matrix head. If the page is slow to start, the name simply appears.
- Shuffle: each letter's pixels rearrange into the same letter of the next
  face while the letter hops, in a left-to-right wave. Every frame snaps to
  the pixel grid, so it reads as pixel art, not dust. Then crisp type returns.
- New paper spreads from the press as a circle. Every point on screen shows
  the whole old page or the whole new one, so ink keeps its contrast. Without
  View Transitions the paper swaps at once.
- Fast taps start from wherever the pixels are and never get lost.
- Foil catches the light as the pointer moves.
- A failed font leaves the current mood intact; a slow font never paints
  half a mood. Reduced motion removes the print pass, the pixels, and the
  spreading paper; moods swap at once.
- The text is always the source of truth. The canvas only draws over it
  while letters move, and without scripts the page is plain letterhead.

## Voice

Plain, warm, and true. Say what the company does, what the client gets, and
wink once. No em dashes, no slogans, no claims the company cannot back.

## Restraint

- One focal element per viewport: the name. Everything else recedes.
- When something feels off, remove before resizing and resize before adding.

Anchors: a letterpress specimen sheet, a dot-matrix printer, a book's colophon.
Never: dashboard density, a SaaS landing page, cards, ambient particles, or
decoration that encodes nothing.
