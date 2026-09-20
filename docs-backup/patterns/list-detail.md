# List–detail

A pane of peer items beside a pane showing the one selected, where selecting in the first replaces
the second.

## The shape it suits

A collection of **peers, each with substance of its own** — enough substance that a whole pane is
worth spending on it. Medium to high cardinality. Order matters. The user selects **exactly one**,
and that is what separates this pattern from every other: a feed is consumed in order, a grid is
scanned, a list–detail is _selected from_.

Material's own examples name the relationship: text message + conversation, file browser + open
folder, artist + album, settings + category, inbox + selected email. All of them are parent–child.

## Take it when

- The user works through many items in one sitting and needs to keep their place.
- The detail is too big to inline and too small to deserve its own screen.
- Comparison-by-switching matters — read one, then the next, without losing the set.

## Leave it when

- **The detail is a handful of fields.** Expand the row instead; a pane for six values is waste.
- **Items are consumed in order rather than selected.** That is a [feed](feed.md).
- **The window is narrow.** Two panes need 840px; below that you get one pane at a time, which is a
  different experience, not a smaller one.
- **The relationship is dependence, not parenthood.** If the second region is only meaningful
  _about_ the first rather than _inside_ it, you want a [supporting-pane](supporting-pane.md).

## Regions

| Region | May hold                                                                                                                                                                                         | May not hold                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| List   | The collection; filters, sort and multi-select over it; a **persistent selection highlight** — "persistently highlight the current selection in each pane that leads to the detail view" (Apple) | A back button in the two-pane form — "use a back button in single-pane layouts only" (Material); editing of the detail |
| Detail | The selected item in full, its own toolbar, its own scroll position — "detail views should retain their scroll position when navigating to other items" (Material)                               | Its own selection state; a second list of the same peers                                                               |

## Width

Two panes from **840px** (Material's expanded breakpoint). Microsoft publishes the hardest number:
320–640 epx stacks, **641 epx and wider** goes side by side. Apple: "prefer using a split view in a
regular — not a compact — environment".

The list pane is **fixed** width; the detail pane is flexible and dominant.

Narrower: one pane, list first, drill in, back returns. Material specifies the round trip — when an
expanded layout narrows, "the detail pane remains visible and the list pane is hidden".

And a density gate, not just a width one: "don't use two panes in medium layouts with high
information density".

## Costs

Half the window is spent on a list. The detail pane is permanently narrower than the window, so wide
content — a table, a canvas, a calendar — fits badly inside it. The "nothing selected" state is real
design work, not a fallback.

## Seen in

Outlook (email) · Airtable (data tooling) · Spotify (media) · macOS System Settings (operating
system) · Linear (work tracking).

## Composition

The detail pane may hold tabs over that one item, a canvas, or a full-bleed escape. At three-pane
widths it may hold a supporting pane.

It may **not** hold a second list–detail. Apple permits a tertiary pane only when "items in the
secondary pane contain additional content" — that is [three-pane](three-pane.md), a named pattern,
not a nested repeat.

## In a board

The root row with a `keep` middle and one collapsing side is already this shape. The side box is the
list, the middle is the detail. Bind them with a ref: the list widget exposes a selection, the detail
widgets read `{ from: ref, ref: "<listTile>/<selectionProp>" }`.

If both side boxes are empty while everything sits in the middle, you have not built a list–detail
no matter what you called it.
