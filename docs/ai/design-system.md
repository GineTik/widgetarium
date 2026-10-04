# Design system

This file is yours. The plugin wrote it once and never writes it again: edit any line and every app
the agent designs from now on follows the edit. The agent reads it whole before stage 3, and a
design that breaks a rule here is redrawn before you see it.

## Look

- **Colours, corners and spacing are the kit's tokens** (`--wg-kit-*`); type is the host's. A
  colour, a font or a radius written by hand is never right.
- **The page is the theme's colour; a `group` is a faint grey plate with no edge.** Plates mean
  "these answer one question", never decoration.
- **Big.** Large controls, large corners, generous space. A dense grid of small buttons is not this
  system.
- **One unusual form per widget**, on the thing the eye looks for: a shape from the kit, an emoji
  drawing, a large number. Shape carries the accent before colour does.
- **Motion answers a press**, never plays on load.

## Placement

- **One primary action per page**, filled, where the eye ends: the top right of the region it acts
  on. Every other action is ghost or lives in a menu.
- **Adding is a button above the list it adds to** (`@default/add-button`), never a form inside the
  list and never a row at its end.
- **A record's edit and delete stand beside the record they act on** (`@default/record-actions`),
  in its header when the record is open, behind a menu on a row.
- **Navigation is a widget, never a markdown list.** Pages of one app are reached from one place,
  the same on every page, and every page but the first has a way back.
- **Every list has its empty state**: what will appear and the one action that fills it.
- **Density follows the job**: a page that is read is airy, a page that is worked through (a
  queue, a review) shows the next thing large and the rest small.
- **Nothing is a dead end**: whatever a person is in the middle of offers Next, Skip, Cancel or
  Done.

## Text

- Sentence case everywhere; a button says the verb (`Add project`, never `OK`).
- A heading names the question its region answers, in the person's words.
- Numbers carry their unit and, when they have a history, their trend.

## Your choices

Write here anything every app should share — an accent shape, a tone, words to use or avoid.
