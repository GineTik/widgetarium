# Three-pane

List–detail with a navigation region in front of it: the sidebar chooses the collection, the list
shows its members, the detail shows one member.

## The shape it suits

Exactly three levels, no more: **collection → item → item's substance**.

Apple derives it from the sidebar depth limit rather than from ambition: "in general, show no more
than two levels of hierarchy in a sidebar. When a data hierarchy is deeper than two levels, consider
using a split view interface that includes a content list between the sidebar items and detail view."

And it sets a structural condition: "a split view can display a tertiary pane **if items in the
secondary pane contain additional content**."

## Take it when

- There are genuinely three levels and the middle one is substantial.
- The window is wide enough that all three panes stay usable.

## Leave it when

- **Under 1600px.** That is where Material recommends three panes. The arithmetic floor is ~1150px;
  the honest recommendation is the published number.
- **The third level is thin.** If the middle list holds four items, it is a segmented control.
- **You want a main surface with helpers on both sides.** SAP Fiori refuses this explicitly — see
  [composition](composition.md). That is [toolbar-and-canvas](toolbar-and-canvas.md) plus
  [supporting-pane](supporting-pane.md), a different pattern with different rules.

## Regions

Sidebar as [sidebar-and-content](sidebar-and-content.md), list and detail as
[list-detail](list-detail.md), with one addition: **every pane that leads to the detail carries its
own selection.** Apple: "persistently highlight the current selection in each pane that leads to the
detail view. The selected appearance clarifies the relationship between the content in various panes
and helps people stay oriented."

The detail pane is the only region that may hold a primary editable surface.

## Width

Material: three panes at **1600px+**. Apple scopes it to iPad and Mac. Derived from component widths:
256 + 320 + 560 ≈ 1150px, which is the floor, not the comfort.

Narrower: fold the sidebar to an icon rail, then to two panes, then to one pane list-first. macOS does
this automatically — "reducing the size of a Mail viewer window can automatically collapse its
sidebar, making more room for message content."

## Costs

The most panes any published system recommends. Three selections to keep coherent. Every pane is
narrow, so nothing wide fits anywhere. Apple's mitigation is to make panes disposable: "consider
letting people hide a pane when it makes sense... provide multiple ways to reveal hidden panes."

## Seen in

Apple Mail on iPad (email) · Microsoft Teams (enterprise comms) · Slack (team chat) · Keynote
(presentation authoring).

## Composition

The detail may hold tabs, a canvas, or a full-bleed object. It may **not** hold a supporting pane at
full width — that is a fourth column and past the ceiling. It may **not** hold another list.

When a fourth level exists, Carbon's rule applies: it becomes tabs inside the detail.

## In a board

This is the whole budget: both side boxes plus the middle. Expressible, but only on a wide screen,
and below the fold-down width the board turns two of the three into drawers — which is the correct
degradation, not a failure.

Do not build it under 1600px of board width. Check with the measured layout before committing.
