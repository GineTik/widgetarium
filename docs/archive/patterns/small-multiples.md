# Small multiples

The same chart, drawn many times at thumbnail size with identical scales and design, once per member
of a set.

## The shape it suits

A set of peers — roughly 10 to 100 — each carrying the **same series shape**. Order is sortable and
meaningful. The user compares across members rather than reading any one precisely.

## Take it when

- The question is "which of these is different", across many of the same thing.
- The comparison is the whole point.

## Leave it when

- **Scales differ per member.** Then the comparison is a lie. A shared scale is not a nicety; it is
  what makes the pattern valid.
- **Each series needs precise reading.** Thumbnails do not afford it.
- **The set is small.** Three series belong on one axis, not in three frames.
- **Space cannot afford legible axes.**

## Regions

| Rule                                                                                                                     | Source                     |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| Shared scale across every frame — mandatory                                                                              | Tufte                      |
| Frames small enough "to allow viewers to make comparisons at a glance — uninterrupted visual reasoning"                  | Tufte                      |
| One base size, multiples of it, consistent aspect ratios                                                                 | Carbon fixed-box grid      |
| Quantity by length or 2D position, never area or colour                                                                  | NN/g, Cleveland and McGill |
| "All charts should use the same layout and spacing, and have legends in the same position relative to the charting area" | Carbon                     |

Tufte's case for it: small multiples "repeat a common design several times within a user's eye span —
with each instance showing different data values" and "visually enforce comparisons of changes, of
the differences among objects, of the scope of alternatives".

## Width

Area is proportional to set size, so this pattern is the one that most needs a width budget decided
in advance. Below the frame's legibility floor, drop members rather than shrink frames.

## Costs

Requires ruthless chart simplification — shared axes, no per-frame legends. Illegible below a floor
size. Costs area linearly with the set.

## Seen in

Per-service latency panels in Grafana and Datadog (infrastructure) · per-region charts in public
health dashboards (epidemiology) · per-store sales in BI tools (retail) · per-repo activity in code
hosting (software) · per-asset sparkline rows in finance apps (markets).

## Composition

Main region. A **single** frame is a sparkline and belongs inside a [metric-tile](metric-tile.md).
Never in a sidebar.

## In a board

Two honest ways to build it, and they are not equivalent.

One widget that draws every frame from one collection — correct, because it can enforce the shared
scale.

Or several copies of the same widget, one per member — **only if** they are bound to a shared scale.
If each computes its own axis, you have built the failure the pattern is defined against, and it will
look fine while being wrong.

Prefer the first.
