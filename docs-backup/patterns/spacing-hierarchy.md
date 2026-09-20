# Spacing hierarchy

The distance a person sees between things says how closely they belong together before any line or
plate says it. Nobody writes it: the engine reads it off the tree you built, so the only spacing
decision left to you is **how you group**.

## The shape it suits

Every board. A **region** is a child of the board's root — the kept column, a sidebar — and every
board has at least one, the kept column, even with no sidebar at all. Spacing is counted from there:

| Where the gap is                                                  | Seen as                      |
| ----------------------------------------------------------------- | ---------------------------- |
| between the children of a region — its sections                   | 24px                         |
| between the children of a box inside a region                     | 16px                         |
| between the children of any box deeper than that                  | 8px                          |
| after a heading (a widget whose role is `text`)                   | one step closer than its box |
| between the children of a box that holds one widget over and over | one step closer than its box |

A `swap` box adds no level: its views space their children as the swap itself would.

## Seen, not written

Every number above is what the eye measures, and the eye measures from the nearest thing it can see:

- between two plates the eye reads cards on one ground, and the room already stands inside them: the
  gap is the step less one plate's 16px of padding, never under 8px — so cards stand one small step
  apart wherever they are, a row of cards counting as a plate only when every one of it is;
- between a plate and bare content the plate's edge is what the eye measures from, so the gap is
  drawn in full;
- a bare widget is seen at its first text, picture or paint, so the engine takes off whatever empty
  edge its own styling leaves there — measured on the drawn board, not declared — and never draws a
  gap under 8px.

So a stat whose author padded it by 12px still stands 24px from the next section, and a widget that
draws its content to the edge gets the whole 24.

## Group right, and the spacing is right

A box is a claim that its children belong together more than they belong to what is beside it. Make
one only when a person would see that claim:

- **It wears a surface** — the plate or the line is the group.
- **It opens with a heading** — the heading names the group.
- **It turns direction** — a row inside a column, a column inside a row: the turn is the group.

A column inside a column, or a row inside a row, with no surface and no heading draws as nothing, yet
it pulls every gap inside it one step tighter. `widgets.mjs lint` names it; move its children up into
the parent, or give it the surface or heading it was missing.

## Take it when

- Always. There is nothing to switch on.

## Leave it when

- **You want two things closer.** Put them in a box that turns direction, or under one heading —
  never a box that only exists to tighten a gap.
- **You want a section further away.** Make it a child of the region, not of a box inside it.

## Costs

Grouping is spent in steps. Three levels of boxes inside a region leave every deeper gap at the 8px
floor, where nothing groups by distance any more — at that depth a line or a plate has to say it.

## Seen in

Material 3 (the internal ≤ external rule, a 4dp base) · Apple Human Interface Guidelines (grouped
insets and section spacing) · TickTick (a detail pane: equal steps between cards, a heading apart) ·
Claude (a sidebar: sections far apart, rows close) · Spotify (shelves apart, cards in a shelf close).

## Composition

With [surface-hierarchy](surface-hierarchy.md): a plate is a group that needs no heading. Cards beside
cards stand close, and a card beside bare content stands a full step away.

## In a board

No field. The tree is the spacing: regions, the boxes inside them, headings and repeated widgets. A
`pad` left in a note is read and dropped on the next write, and `lint` names it until then.
