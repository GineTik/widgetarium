# Matrix

A dense grid whose rows are entities, whose columns are equal time intervals, and whose cells carry
one small value per pair.

## The shape it suits

The cross-product is **complete and regular**: every entity has a value — possibly zero — for every
interval. Cardinality is high in cells, low in distinct values. Order matters on both axes.

The user rarely selects a cell. They read **streaks, gaps, clusters and hot spots**.

The governing constraint: the per-cell value must be categorical or low-precision, because the only
encoding a cell affords is colour, and colour is the bottom rung of the perceptual ladder.

## Take it when

- The question is "how consistent", "where are the gaps", "which row is doing better".
- The grid is dense enough that its shape carries meaning.

## Leave it when

- **Magnitude must be read precisely.** Cleveland and McGill's ordering: position on a common scale >
  position on non-aligned scales > length > angle > area > colour saturation. A cell is last. NN/g
  adds that colour must not encode quantity at all.
- **The matrix is sparse.** Mostly-empty cells make a grid that is almost all background.
- **Either axis is large in a static view.** Practitioner guidance: keep under about 30 × 30.
- **Rows are not comparable to each other.** The whole payoff is reading down a column.
- **The dataset is small.** Bars or lines say it more clearly.

## Regions

| Region | May hold | May not hold |
| --- | --- | --- |
| Row labels | The entity name, as text | Anything wider than the labels need — this column is a width thief |
| Cell field | One low-precision value per cell, encoded as fill | A number that must be read; a second encoding competing with the first |
| Detail affordance | Hover or tap revealing the exact value — required, not optional | — |

## Width

Cell size is the governing number, and the binding constraint is the **tap target**, not legibility:

- If cells are individually actionable: **cell + gap ≥ 24px** (WCAG 2.2 SC 2.5.8), or ≥ 24px offset
  to every adjacent target. Ergonomic targets are 44pt / 48dp.
- If they are not actionable, cells may shrink — but then another route to the value is required.

Required width = columns × (cell + gap) + the label column. Canonical proportions from the
best-known instance: **52 columns × 7 rows** for a year of days.

Narrower: fewer intervals, never smaller cells past the target floor.

## Costs

Cell values are unreadable without a tooltip. Colour scales are the accessibility weak point. Adding
a row costs a full grid row; adding an interval costs a column across every row.

## Seen in

GitHub contribution graph (code hosting) · When2meet and Doodle availability (group scheduling) ·
habit trackers (personal behaviour) · correlation matrices (statistics) · shift rosters (workforce) ·
seat maps (travel).

Six domains with nothing in common. This is the strongest convergence evidence in the catalogue.

## Composition

Main region for the full matrix. A **single-row strip** — one entity × N intervals — is the only
version that fits a tile or a pane, and at that size it is really a sparkline.

Never in a nav sidebar. Inside a dashboard tile only at strip size: a full matrix wants a near-square
and violates the 2:1 tile minimum.

## In a board

This is the habit-tracker shape, and it is one widget, not a screen. A matrix widget belongs in the
`keep` region with a `maxSize.w` that matches its interval count — 7 columns for a week, 52 for a
year. Without that cap the board will stretch it and the cells will grow into meaningless slabs.

A screen *about* a matrix is a [list-detail](list-detail.md): rows on one side, the selected row's
detail on the other.
