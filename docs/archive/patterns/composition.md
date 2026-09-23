# How patterns nest

Patterns combine. An outer shell holds a content pattern, and that content pattern may hold another
shell inside it. This is not a loophole — it is how every real product is built. But it has
published limits, and four design systems that never talked to each other agree on them.

## The pane budget

Material 3 states it as a law of the layout, not advice:

> All content must be in a pane. A layout can contain 1–3 panes of various widths, which adapt
> dynamically to the breakpoint.

| Width     | Panes recommended                     |
| --------- | ------------------------------------- |
| under 600 | 1                                     |
| 600–839   | 1, or 2 if the content is low-density |
| 840–1199  | 1 or **2**                            |
| 1200–1599 | 1 or **2**                            |
| 1600+     | 1 to **3**                            |

Apple's version is structural rather than numeric: two or three panes, and the third only "if items
in the secondary pane contain additional content".

**What this costs you when composing.** A sidebar is one pane. A list–detail is two. Together that is
three — the ceiling, and only above 1600px. Adding an inspector to that is a fourth pane and is out
of budget: either the inspector becomes a drawer, or the list pane folds to icons.

Count panes before you place a single tile.

## Depth inside one navigation region

Every system publishes a ceiling, and they differ by one:

| System         | Ceiling | What it says                                                                               |
| -------------- | ------- | ------------------------------------------------------------------------------------------ |
| Apple HIG      | **2**   | "In general, show no more than two levels of hierarchy in a sidebar."                      |
| IBM Carbon     | **2**   | "The left panel does not support three tiers of navigation."                               |
| Fluent 2       | **2**   | "Navs can be organized with up to two levels of hierarchy."                                |
| Ant Design     | 1–3     | "Keep the information architecture hierarchy shallow, flat, and wide as much as possible." |
| Adobe Spectrum | 3       | "Adding more than three levels will make the indentation indiscernible."                   |
| Primer         | 4       | "Use up to 4 nesting levels — reconsider your navigation design if you need more."         |

Four of the systems that publish a number say **two**. Primer is the outlier. Treat two as the
working ceiling and three as an argument you have to win.

The agreement matters more than the disagreement: every one of them names the same escape rather
than allowing a deeper region. When depth exceeds the ceiling, the extra level **leaves** — as a
middle pane (Apple: "a split view interface that includes a content list between the sidebar items
and detail view"), as in-page tabs (Carbon: "use tabs within the page"), as a tree component
(Fluent), or as pop-up navigation (Ant).

Depth is never solved by indenting further.

## Two levels of navigation

Allowed, with one rule that has a name and a failure mode.

Apple permits a sidebar inside a tab, and immediately states the condition:

> If you do this, be sure to prevent selections in the sidebar from changing which tab is currently
> open.

Generalised: **an inner navigation region must never change the outer region's selection.** That is
exactly the coherence bug in nested sidebars — switching the outer rail while a stale inner
selection survives.

Material's rule for its own component is stricter: "A navigation rail should be the only visible
navigation element."

On tabs specifically, Material **sanctions** two levels — by giving the second one its own
component. Primary tabs sit "at the top of the content pane"; secondary tabs are "used within a
content area to further separate related content and establish hierarchy" and are "necessary when a
screen requires more than one level of tabs". Carbon does the same with a content switcher "at a
lower hierarchy to sort related contents within that tab content".

What is forbidden is repeating the _same_ component. Carbon: the two tab variants "are
hierarchically the same and should never be nested within each other". Nielsen Norman: avoid
"stacking tab lists within one tab control". GitLab's Pajamas allows two levels and calls it "a last
resort due to the complexity it creates both in code and for the user experience".

Two navigation levels are legal only when they differ in kind and in rank. A rail plus in-page tabs
is fine. Primary tabs plus secondary tabs is fine. Two rails, or one tab component inside itself, is
the forbidden case.

Carbon also caps the count before escalation: "In most scenarios, you should use no more than six
tabs... If more than six tabs are needed, consider other navigation patterns, such as a side-nav."
Rank is fixed — tabs sit under a sidebar, never above it.

## When a nested layout must stop being nested

Three published triggers. Any one of them ends the nesting.

**Depth overflow.** Hierarchy deeper than the ceiling above. The extra level becomes a pane or a set
of tabs.

**Modality.** Apple is flat about it:

> Take care to avoid creating a modal experience that feels like an app within your app. In
> particular, presenting a hierarchy of views within a modal task can make people forget how to
> retrace their steps.

And: "Let people dismiss a modal view before presenting another one."

That is a prohibition on two things at once — no layout hierarchy inside an overlay, and no stacked
overlays. A drawer that opens a modal that opens a drawer is over the line, at both ends.

**Density.** Material gates nesting on content, not only on width:

> Don't use two panes in medium layouts with high information density, as it can reduce usability.

Two panes is not licensed by having 900px. It is licensed by having 900px **and** content sparse
enough to survive the split.

## Independent scrolling

Side-by-side panes may scroll independently — they are siblings, not nested. A side sheet's position
survives the page scrolling, and the reverse. It may **not** scroll horizontally: a narrow region has
no room to show a horizontally scrolled item. Detail panes must keep their scroll position when the
selection changes.

Nesting one scroll inside another has a rule, and it is about **axis**. Apple:

> Avoid putting a scroll view inside another scroll view with the same orientation. Nesting scroll
> views that have the same orientation can create an unpredictable interface that's difficult to
> control. It's alright to place a horizontal scroll view inside a vertical scroll view (or vice
> versa), however.

Baymard's measured version: "Scrolling within scrolling is simply not an easy concept to grasp", and
truncation is usually the better answer for a long list inside a page.

No system publishes a limit on how _many_ regions may scroll independently. The pane budget is the
effective proxy; do not invent a second rule on top of it.

## The budget, condensed

| Rule                                                                     | Where it comes from                 |
| ------------------------------------------------------------------------ | ----------------------------------- |
| At most 3 panes, and only above 1600px                                   | Material 3, Apple, SAP Fiori        |
| At most 2 levels inside one navigation region                            | Apple, Carbon, Fluent, Ant, Pajamas |
| Overflow leaves the region — a pane, in-page tabs, a tree, or pop-up nav | Apple, Carbon, Fluent, Ant          |
| An inner nav region never moves the outer selection                      | Apple HIG                           |
| Two nav levels only across different component kinds and ranks           | Material, Carbon, NN/g              |
| At most 6 tabs before escalating to a sidebar                            | Carbon                              |
| No layout hierarchy inside an overlay; no stacked overlays               | Apple HIG, NN/g                     |
| No same-axis nested scrolling; cross-axis is fine                        | Apple HIG                           |
| Drill-down columns are not main-plus-side-panels                         | SAP Fiori                           |
| Two panes need low density, not just width                               | Material 3                          |

## Drill-down is not main-plus-panels

SAP Fiori is the only system that says this outright, and it is the sharpest composition rule here.
Its three-column layout is for drill-down — collection, item, item's substance — and it refuses the
shape people confuse it with:

> Do not use the flexible column layout if: you want to build a workbench or tools layout. The
> flexible column layout is not meant to provide a main column with additional side columns on the
> left and/or right.

Three panes of drill-down ([three-pane](three-pane.md)) and a main surface flanked by helpers
([supporting-pane](supporting-pane.md), [toolbar-and-canvas](toolbar-and-canvas.md)) look alike from
a distance and obey different rules. Decide which you are building before you place the first tile.

## In a board

A Widgetarium board is a recursive tree: a node is a leaf (a tile) or a box (`row` / `column`) that
holds other nodes. That maps onto panes directly — **one box at the root's level is one pane.**

The root of a new board is a row of three boxes: a side box with `collapse`, a `keep` middle, another side box.
That is already the three-pane budget spent. A fourth region at that level has nowhere to come from,
which is not a limitation of the board — it is the published ceiling, enforced by the shape.

Nesting deeper is free in the tree and expensive for the reader. The tree will happily hold a box
inside a box inside a box; the rules above say when that has stopped being a layout and started
being a maze.
