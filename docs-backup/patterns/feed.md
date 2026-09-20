# Feed

One vertical column of self-contained items in a defined order, consumed by scrolling rather than by
selection.

## The shape it suits

Unbounded or very high cardinality. Items are peers. Order matters strongly — recency or rank — and
the user **accepts** the order rather than re-sorting it. Items are **heterogeneous**, which is what
makes a card the right container: cards suit "heterogeneous content where items vary in type and
information structure", while for homogeneous content a list or grid scans better.

## Take it when

- The set is unbounded and consumed sequentially.
- Items differ in shape from one another.

## Leave it when

- **The user is looking for something specific.** Avoid infinite scroll when users need to "find
  something specific", "compare items in a long list", or "inspect only a few items at the top".
- **Items are homogeneous.** Use a [gallery](gallery.md) or a list — cards "deemphasize content
  ranking and reduce scannability".
- **Screen space is tight.** "Cards consume more space than list-view equivalents, reducing viewable
  items without scrolling."
- **The user must return to an item.** Infinite scroll has documented "difficulty refinding content".

## Regions

One column. The rules are about what it does to the page:

| Rule                                                                  | Why                                                                                                                                                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A feed does **not** take the full width of a wide window              | Text obeys the measure: 40–60 characters ideal, 80 the WCAG AAA ceiling. Cap at `min(container, ~60ch)` and give the surplus to another region or to margin |
| Column count is 1 by definition                                       | Add columns only when a minimum item width fits — and then it is a gallery, not a feed                                                                      |
| Under about three items it is not a feed                              | That is an [empty-state](empty-state.md) boundary                                                                                                           |
| Past a threshold, pick one: Load More, pagination, or infinite scroll | "Just keep loading" is the option with the documented failure                                                                                               |

## Width

`min(container, ~60ch)`. This is why no serious reading surface fills a 1600px window with prose.

## Costs

No landmarks — the user cannot say "it was near the top of page 3". Consumes vertical space fast.
Comparison is impossible without memory.

And the structural one: **a feed is what every other pattern collapses into when nobody designs it.**
A column of full-width tiles is a feed wearing a dashboard's clothes.

## Seen in

Twitter and Instagram (social) · Slack and email (messaging) · Reddit and Hacker News (aggregation) ·
an audit log in any admin tool (operations) · Apple News (publishing).

## Composition

Main region, or a supporting pane at ~30% of a wide window. It is the only content pattern here that
survives a narrow pane, because its native column count is one.

Not in a nav sidebar — a sidebar is navigation, capped at two levels, and a stream of arbitrary items
is neither.

## In a board

A `column` box of tiles is a feed. That is fine when the items really are a stream.

It is **not** fine as the default answer to "put these widgets somewhere". If every tile in the column
is full width and none of them is a stream, you have built the failure this catalogue exists to
prevent — check [dashboard-grid](dashboard-grid.md) and [list-detail](list-detail.md) before settling
for it.
