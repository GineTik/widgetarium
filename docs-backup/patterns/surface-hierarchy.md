# Surface hierarchy

The order in which planes stack on a screen — region, pane, plate, the plate inside it — so that each
level reads as held by the one around it, every unit a person reads as one thing has a visible edge,
and no level is spent where spacing already groups.

## The shape it suits

Any screen with more than one unit of information. A unit is what answers one question: one measure,
one list, one selected thing, one place to write. What separates units is their **role**, never their
shape: four stat tiles that look alike are four measures, and each keeps its own edge; forty playlist
rows that look alike are one collection, and none of them gets one.

| Level                | Surface                                             | Says                                                  |
| -------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| region / pane        | `divider`                                           | these are different areas of one screen               |
| plate                | `fill`                                              | this is a piece of the screen's information           |
| plate inside a plate | `fill`, one step darker, one corner step rounder-in | a group inside that piece — never every child at once |
| raised object        | `outline`, only as the first plate                  | this is a thing on top of the page you work in        |

A divider costs no level. A plate costs one. A widget that paints its own containers has spent levels
before you place it, and the ceiling is two.

## Take it when

- Several units of different roles share a column, and whitespace alone does not show where one ends
  — the right column of a music player: about, credits, queue.
- An overview of several measures — one plate for the overview with the measures bare inside it, or
  no plate for the overview and a plate per measure the way BillionMail does. Never both: a plate
  whose every child wears a plate is an error (N2).
- A place to write sits among things to read — the reply box of a support thread, raised with an
  outline.
- A navigation pane sits at the edge of a row — a library sidebar beside a feed.

## Leave it when

- **The node is a `control`.** A card around a search field is a container holding one element.
- **The node is `text`.** A heading labels the unit beside it; a plate around it cuts it off from that unit.
- **The node is alone in its box.** The box already sets it apart.
- **The node is a `collection` inside a plate.** The plate is its edge; its items never get one.
- **An `outline` would stand inside any plate.** Raised objects live at the top; inside, use a darker
  `fill` or a line.
- **The widget already paints containers two deep.** A kanban is columns of cards; wrapping it is a third
  level.
- **You are not sure.** No surface. A surface amplifies grouping; its absence never breaks a screen
  spacing already holds.

## Regions

| Part                          | Rule                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Sidebar                       | `navigation` — divided from the kept column, never carded as a whole                          |
| Kept column                   | Wears nothing; its groups are judged by role                                                  |
| Overview of measures          | `indicators` plate with the measures bare inside, or a plate per measure and none around them |
| List, board, feed, thread     | `collection` — one plate at most, none between items, none inside another plate               |
| Reply box, form, editor       | `composer` — an outline at the top, a fill where an outline may not stand                     |
| Search, filter, period switch | `control` — no plate; inside the unit it drives, or in the page header                        |
| Heading, caption              | `text` — no plate; on the surface of the unit it labels                                       |

## Width

A plate costs 32px of width (16px padding each side) before a widget draws anything, and a plate inside
a plate costs 64px. Under 360px of column, prefer a divider or nothing.

## Costs

Every plate is paid in padding, in contrast budget and in the depth left for widgets. A screen that
spends two plates on an overview has none left for a widget that paints its own.

## Seen in

Spotify (music: a divided library, carded now-playing details) · Claude usage (developer tools: one
plate for the overview, darker plates for each measure) · BillionMail (email: a card per measure, a
card per chart) · Rybbit (analytics: measures in one strip, each in its own cell) · Claude Code
(developer tools: a divided sidebar, raised panels that stand side by side) · Help Scout-style support
inboxes (support: a thread as one collection, the reply raised beneath it).

## Composition

- The nesting table is absolute: nearest plate above none → `fill`, `outline`, `divider`; above a `fill`
  or an `outline` → `fill` or `divider` only.
- Units share one plate only when they share a `purpose`.
- A swap box keeps the surface of the node it replaces; its views are content, not cards.

Read [spacing-hierarchy](spacing-hierarchy.md) with this one: the gap between plates and the gap inside
them are one decision.

## In a board

`role` and `purpose` on every group box, `role` in every widget manifest, `surface` from `fill`,
`outline`, `divider`, `none`, and `side` on a divider. Run
`node .widgetarium/bin/widgets.mjs surfaces <note> --text` and write what it advises. The roles, the
nesting table, the laws and the phase are in `../surfaces.md`.
