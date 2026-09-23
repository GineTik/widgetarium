# Sidebar and content

A persistent vertical region listing the destinations of a space, beside one content region showing
whichever destination is selected.

## The shape it suits

A flat or two-level set of named destinations that are **not peers of each other's content** — the
sidebar names places, the content region holds substance. The set is small enough to show at once and
too large for a horizontal bar.

Carbon puts a number on the boundary: "use the left panel if there are more than five secondary
navigation items, or if you expect a user to switch between secondary items frequently."

## Take it when

- More than five destinations, or frequent switching between them.
- Location must never be inferred — the user should always see where they are.

## Leave it when

- **Three or four destinations.** A tab strip costs less and leaves the width to content.
- **Space is scarce.** Apple: "a sidebar requires a large amount of vertical and horizontal space.
  When space is limited or you want to devote more of the screen to other information, a more compact
  control such as a tab bar may provide a better navigation experience."
- **The destinations are really one collection.** Then it is a [list-detail](list-detail.md), and the
  difference matters: a list gets filters and multi-select, a sidebar does not.

## Regions

| Region  | May hold                                                                                                                                                                                                                    | May not hold                                                                                                                                                                                                                                                                                                                                       |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar | Navigation destinations; disclosure groups; a compact list; small read-only indicators and badges; icons on first-level items only — "in multi-level side navigation, only the first-level items can have icons" (Spectrum) | More than two levels of hierarchy; a primary editable surface; anything that wants to expand; **critical information or actions at the bottom** — "people often relocate a window in a way that hides its bottom edge" (Apple); a second visible navigation element — "a navigation rail should be the only visible navigation element" (Material) |
| Content | The selected destination's full surface; its own toolbar; its own scroll                                                                                                                                                    | A duplicate of the sidebar's destination list                                                                                                                                                                                                                                                                                                      |

Width generosity is a stated rule, not taste: "make the width generous enough so that it doesn't feel
too condensed. Doing this will ensure that users won't confuse the side navigation with buttons or
other controls" (Spectrum).

## Width

Carbon's left panel is **256px**; Spectrum's default is 240px. A usable content region beside it wants
≥600px, so the full form starts around **840px** — the first breakpoint at which two panes are
recommended.

Narrower: a collapsed icon rail of 3–7 items, then a bottom bar or a modal [drawer](drawer.md). Apple
offers the same move automatically: "consider automatically hiding and revealing a sidebar when its
container window resizes."

## Costs

The most horizontal space of any navigation form. Items compete for attention permanently — a
destination nobody visits still takes a row forever. Deep hierarchies become unreadable by
indentation alone.

## Seen in

Stripe Dashboard (payments) · Notion (documents) · Shopify admin (commerce) · Jira and Confluence
(work management).

## Composition

The content region may hold a list–detail, a view switcher, a canvas, a supporting pane, or a
full-bleed object.

It may **not** hold another sidebar of the same rank — two independent rails read as two apps. If the
outer region selects _what kind of thing_ the inner one lists, that is a named pattern:
[nested-sidebars](nested-sidebars.md). Declare it as that, or do not build it.

A sidebar inside a tab is permitted by Apple with one condition: "prevent selections in the sidebar
from changing which tab is currently open."

## In a board

The root row's collapsing side box is the sidebar; the `keep` middle is the content. Nothing in the
side box may want to grow — check each widget there has a `maxSize.w`, or it will fight the region it
was put in.
