# Dashboard grid

A bounded set of equal-rank containers on a shared grid, each answering one question, arranged so the
whole set is comprehensible without scrolling or interaction.

## The shape it suits

Low cardinality — roughly **4 to 12** tiles. Items are peers: no tile is the main one in reading
order, only in visual weight. Order matters as priority, not sequence. The user selects nothing; they
**scan**.

Each tile's payload is a single derived conclusion — a count, a rate, a trend — not a dataset.

## Take it when

- Status must be readable at a glance, without interaction.
- Each question is independent of the others.

## Leave it when

- **It scrolls.** A dashboard is "consolidated in a single computer screen so it can be monitored at
  a glance". A grid that scrolls has become a report, and the at-a-glance claim it makes is false.
- **One tile outranks the rest.** Carbon: tiles "have the same visual hierarchy as content on the
  same page". If something must dominate, it is not a tile.
- **The data needs comparison across items.** Separately-scaled tiles make cross-tile comparison a
  memory task. Use [small-multiples](small-multiples.md).
- **The task is "find the one that's wrong".** Scanning is preattentive; finding a record is search.

## Regions

One region, and the rules are about its contents:

| Rule | Source |
| --- | --- |
| Most important data has the highest contrast and the largest area, placed top-left along the F-pattern | Carbon |
| Equal rank ⇒ equal size. "Tiles are the same in height and width as all other tiles in the group" | Carbon |
| Don't mix tile variants in one group | Carbon |
| Minimum tile height is a **2:1** aspect ratio | Carbon |
| Limit the number of metrics; strip anything that distracts | Carbon |
| Encode quantity with **length or 2D position** — never colour, because "people do not perceive different colors as being in a particular order" | NN/g |
| Refuse pie, donut, gauge and treemap in a tile — "circular visualizations require a lot of space to communicate little information" | NN/g |
| Tiles per row must divide the column count | Carbon, Atlassian grids |

## Width

Full width of the content region. Tile width is an integral column span: on a 12-column grid, 4-up is
3 columns each, 3-up is 4 each. **A 5-up row does not divide 12, which is why it always looks wrong.**

Narrower: fewer columns, then one. Watch that stacking does not break the grouping.

## Costs

The most screen area per bit of any pattern here. Tempts uniform-weight layouts that encode no
priority. Multiple simultaneous failures look absurd — Carbon warns that repeated illustrated empty
states lose their impact and recommends text-only in that case.

## Seen in

Google Analytics (web analytics) · Datadog and Grafana (infrastructure) · Stripe (payments) · Apple
Health summary (personal health) · Shopify admin home (commerce).

## Composition

Main region, full width. Never inside a nav sidebar. Never inside a supporting pane — a grid needs at
least two columns to *be* a grid, and a pane is a single-column space. A single tile may live in a
pane; a grid may not.

## In a board

A `column` of `row` boxes in the `keep` region. Each row is a group; the gap between rows is what
groups them, so do not make every gap the same.

The failure this pattern is most often built into: every tile at full width in one column. That is not
a dashboard grid — it is a [feed](feed.md) of tiles, and it encodes no priority at all.
