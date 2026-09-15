# Nested sidebars

An outer region selects *which kind of thing* is being worked with, a second region lists the things
of that kind, and the content region shows the one selected.

## What the pattern actually is

A code editor, a chat app, a database client and an email client are **one pattern**, and calling
them four things is the mistake. The invariant: the outer region is a **mode switch over the inner
list's contents**, not a navigation peer of it.

VS Code's own documentation says it plainly — the Activity Bar "lets you switch between views", and
the Primary Side Bar "contains different views like the Explorer". The outer rail is a selector for
the second sidebar's dataset. Discord's server rail selects which channel list. Supabase's product
rail selects whether the inner sidebar lists tables or SQL snippets. A mail client's account rail
selects which mailbox tree.

Apple frames the same shape from the depth side: "when a data hierarchy is deeper than two levels,
consider using a split view interface that includes a content list between the sidebar items and
detail view".

## The shape it suits

A **two-axis** hierarchy: a small, stable set of kinds (3–7) crossed with a large, volatile set of
instances per kind.

## Take it when

- The kinds are few and stable, and the instances are many and churning.
- A user works within one kind for a long stretch, then switches.

## Leave it when

- **The outer set is large.** More than seven kinds and the rail stops being scannable.
- **The inner set is small.** Then the second sidebar is chrome around three items — collapse to
  [sidebar-and-content](sidebar-and-content.md).
- **Below about 1200px.** Three regions of chrome before any content is a desktop layout, honestly.

## Regions

| Region | May hold | May not hold |
| --- | --- | --- |
| Outer rail | 3–7 kind destinations — "the collapsed nav rail should contain 3–7 navigation items. It should not be hidden" (Material); one anchored primary action; a logo, but "avoid using logos that could be mistaken as buttons" | Instance-level items; labels long enough to truncate — "labels should be short enough to not be truncated. Don't shrink the type scale to fit longer text labels"; a second active indicator |
| Inner sidebar | The list of objects of the selected kind; search and filter over that list; grouping headers; per-item affordances | More than two levels of hierarchy; the primary editing surface |
| Content | The selected object, with its own toolbar and tabs | The object list again |

## Width

Derived from published component widths: outer rail ~80px collapsed, inner sidebar 240–256px,
content ≥600px — so roughly **1100–1200px** for the full form. Material only recommends three panes
at **1600px+**, so treat the derived number as the floor and Material's as the comfortable case.

Narrower: collapse the outer rail to icons first — it must not be hidden. Then fold the inner sidebar
into a [drawer](drawer.md). Then three pushed screens.

## Costs

The most expensive shell here: three regions of chrome before any content. Two selection states must
stay coherent, and a stale inner selection after an outer switch is the classic bug of this pattern —
see the non-interference rule in [composition](composition.md).

Carbon forbids going one step further inside a single panel: "the left panel does not support three
tiers of navigation. If you have additional content to display beneath a sub-menu, use tabs within
the page."

## Seen in

VS Code (developer tooling) · Discord (consumer social) · Microsoft Teams (enterprise comms) ·
DBeaver (database tooling) · Supabase Studio (backend platform).

Five domains with nothing in common, one shape. That is the evidence.

## Composition

The content region takes tabs, a canvas, a supporting pane, or a full-bleed object.

It may **not** take another list with its own pane — that is a fourth column and past the pane
ceiling. It may **not** take a third sidebar: Carbon's three-tier rule and Fluent's two-level rule
both send the extra level into in-page tabs instead.

## In a board

Expressible, but it spends the whole budget: outer rail and inner list as the two side boxes, content
in the `keep` middle. Both sides must then be real regions with real widgets, and the middle must read
from both by ref.

If you cannot name what the outer rail *switches*, you do not have this pattern — you have two
sidebars, which is the thing every system tells you not to build.
