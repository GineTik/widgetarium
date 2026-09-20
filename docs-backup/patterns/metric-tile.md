# Metric tile

A container whose dominant element is one number, supported by a label, a comparison, and optionally
a micro-trend.

## The shape it suits

Cardinality one: exactly one scalar per tile. In a row, **three to five peers** that share a time
window and a subject. Order is priority order. The user selects nothing, though the tile is usually a
link into the detail that explains it.

## Take it when

- One number carries a decision, and the reader needs it without interaction.
- The number has something to be judged against.

## Leave it when

- **The number has no baseline.** A bare figure is unreadable as good or bad. **A stat tile with no
  comparison is a defect, not a minimal version.**
- **The metric is not a peer of its neighbours.** A row mixing a count, a currency and a percentage
  of three different subjects reads as three unrelated things in one costume.
- **The shape over time is the interesting part.** Then it is a chart, and length beats a numeral.
- **There are more than five or six.** Past that the row stops being a hierarchy and becomes
  wallpaper.

## Regions

| Part       | Rule                                                                         |
| ---------- | ---------------------------------------------------------------------------- |
| Period     | Stated, not assumed                                                          |
| Label      | One or two words; it wraps, the number never does                            |
| Value      | The single largest element on the card, ideally the largest type on the page |
| Comparison | Period-over-period, or against a target. Required                            |
| Sparkline  | Optional, and it is a [small-multiple](small-multiples.md) of one            |

Across the whole page, keep to **no more than three distinct type sizes**.

## Width

On a 12-column grid: a row of four is three columns each, a row of three is four each. Both divide
cleanly. **A row of five does not divide twelve, which is why five-up rows look wrong.**

Minimum tile proportion is **2:1**. Padding 16px, gutter 32px, mini unit 8px.

Too many: wrap to a second row at the **same** size. Never shrink the last two to make them fit.

## Costs

Almost no information per pixel — the most expensive way to show one number, justified only by
importance. A row of them is the most common form of the dumped-widgets disease.

## Seen in

Stripe (payments) · Google Analytics (web) · Datadog single-stat panels (infrastructure) · Apple
Health (personal health) · Power BI KPI cards (business intelligence).

## Composition

A row of them sits at the top of the main region. A **single** tile fits a supporting pane.

Never a row of them inside a sidebar — a sidebar is navigation and has neither the width nor the
mandate.

## In a board

A `row` box holding three or four metric widgets, each with the same `ratio`, at the top of the
`keep` column. Equal rank means equal `ratio` — a row of `[2, 1, 1]` is a claim that the first one
matters twice as much, and it had better be true.

Three metric tiles all showing the same metric for the same subject is not a row of peers. It is one
tile, drawn three times.
