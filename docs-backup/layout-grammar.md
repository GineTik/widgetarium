# The layout grammar

## TL;DR

A board is a tree of **layout nodes** that stand around widgets and never are widgets. Every node is
one of three sorts — a container, an edge, or a leaf — and one table says what may hold what. Levels
were the wrong idea: a split is a split whether it is the page or the corner of a card, so depth is
carried by a ceiling per sort rather than by a level per pattern.

## Why a grammar and not a list of layouts

A catalogue of named layouts duplicates itself the moment two of them draw the same picture. Four of
the shells in `docs/patterns/` did exactly that, because they differed in what a pane held, which a
name cannot say. A grammar says it: the node kinds are few, and what differs between two screens is
which node holds which.

It is also the extension point. A person who wants a layout nobody shipped adds a node and its row in
the table; the plates, the gaps, the corners and the collapse keep working, because none of them ever
knew the node's name. The engine reads structure, never names — the same property that made the tree
worth having over the grid.

## The three sorts

**Containers** hold other nodes by index.

| node      | what it is                                                              |
| --------- | ----------------------------------------------------------------------- |
| `row`     | children side by side                                                   |
| `column`  | children stacked                                                        |
| `split`   | a row of two with equal ratios, claiming neither child serves the other |
| `swap`    | children of which one is drawn, the rest kept mounted                   |
| `centred` | exactly one child, held to a measure and centred in what is left        |
| `paged`   | children of which one is a whole screen, moved through one at a time    |

**Edges** take a position from their parent rather than an index.

| node                      | what it is                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `side`                    | a pane at the start or end of a row                                                    |
| `rail`                    | a `side` that never grows — a fixed set, whatever the person has                       |
| `strip`                   | a bar along one edge: what is below it named at the leading end, the controls that act |
| on it at the trailing end |

**Leaves** hold content, and which leaf a collection becomes is decided by the card rule in
`docs/ai/surfaces.md`: `list`, `rowOfPeers`, `gridOfPeers`, `table`, `cross`, `field`, `feed`,
`conversation`, `widget`.

## What may hold what

Read the row as the parent. **Refused** means it cannot be drawn and lint exits 1. **Unusual** means
rare across the products measured but expressible, so it is a warning a person may dismiss.

| parent ↓ / child → | row · column | split     | swap      | centred | side · rail | strip               | leaves                        | paged |
| ------------------ | ------------ | --------- | --------- | ------- | ----------- | ------------------- | ----------------------------- | ----- |
| `row` · `column`   | yes          | yes       | yes       | yes     | yes         | first or last child | yes                           | no    |
| `split`            | yes          | unusual   | yes       | yes     | no          | in each half        | yes                           | no    |
| `swap`             | yes          | yes       | no        | yes     | no          | no                  | yes                           | no    |
| `centred`          | one child    | one child | one child | no      | no          | through its column  | one child                     | no    |
| `side`             | yes          | no        | yes       | no      | no          | head and foot       | yes                           | no    |
| `rail`             | column only  | no        | no        | no      | no          | no                  | fixed sets only               | no    |
| `strip`            | no           | no        | no        | no      | no          | no                  | **controls and one identity** | no    |
| `paged`            | one per page | yes       | no        | yes     | yes         | yes                 | bounded only                  | no    |

Three rows carry the weight.

**A `strip` holds nothing structural.** Controls, and one identity at its leading end. Across sixteen
products no centre of a strip ever held anything but a search field or a title, and no strip held a
list, a board or a feed. This is the only row refused outright rather than warned about.

**A `side` is head, body and foot.** Six of nine products hold a fixed block above or below the part
that grows, the ends sticky and the middle scrolling. So a `side` takes a `strip` at either end and a
column between — the strip primitive turns up inside the very region it was called an alternative to.

**A `centred` holds one child.** Holding many would make it a column that also centres, which is two
jobs in one node. The child is usually a column.

## Two names that were deleted

**`header + body` is not a node.** It is a `column` whose first child is a `strip`. Keeping both was
one thing under two names, and the composition lost.

**`bands` is not a node.** A page of sections is a `column`, and a section is free to hold a `centred`
of its own. Which is also the right nesting: a section must be able to carry a background across the
whole width while its content stays at the measure, and `centred` above the sections traps the paint
inside the measure. **A `centred` goes inside a section, never around them.**

## Boundedness propagates

`feed` and `conversation` are **unbounded**: they have no last item, so they have no height of their
own. Everywhere else this is harmless, because the page scrolls. Under a `paged` ancestor it is not:
a screen moved through sideways has no downward scroll, and content cannot spill out of it.

> **An unbounded leaf under a `paged` ancestor must sit in a box that gives it a floor and takes the
> scroll.** Without one the page is refused — not warned, refused, because it cannot be drawn.

A feed inside a side inside a page is fine: the side is that box. The machinery exists already — a box
carries `scroll` and a floor. What `paged` adds is that they stop being optional, and that the
requirement travels **down from an ancestor** rather than being declared where it applies. `measure`
travels the same way.

## The ceilings, which replace the levels

A node learns its depth per sort by walking up, which is the walk the plate and spacing rules already
make.

| what                            | ceiling                            | where it comes from                                            |
| ------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `strip` nesting                 | 4 — the fourth is a row, not a bar | VS Code and Salesforce document four; no source documents five |
| plates from the region          | 2                                  | `docs/ai/surfaces.md`, law 5                                   |
| panes                           | 3, and only above 1600px           | `docs/patterns/composition.md`                                 |
| navigation levels in one region | 2                                  | Apple, Carbon, Fluent, Ant, Pajamas                            |
| spacing steps                   | 3, then it floors at 8px           | `STEP_PX` in `src/tree.js`                                     |

The fourth `strip` keeps the arrangement and drops the bar: no plate, no height of its own, one
trailing control instead of a group. At that point it is the top line of a card, arriving from above.

## What the research settled, and what it did not

**Settled — a strip is ordered by scope.** Carbon states it as a gradient: moving toward the trailing
end, elements become progressively more global, from the name of what is below to a switcher between
whole products. So the leading end is the only place in a window that names _this_ thing, and a `side`
has no such ordering — it is a flat set, and nothing in it changes when the content changes. That is
the sharpest line between the two, sharper than position or width.

**Settled — the centre of a strip holds a search field or a title, and nothing else.** Seven of
sixteen use it; no other occupant was found at any level in any product. Which of the two it is
depends on what the leading end already spends: a product mark leaves the centre free for search,
tools or window chrome displace the identity into it. Apple states the width rule — leading and
trailing survive every window size, the centre collapses into overflow first — so the centre is the
only part of a strip optional by construction.

**Not settled — whether a strip grows.** One study concluded that a growing strip grows with
_session_ data while only a `side` grows with _stored_ data; the other found a record header that
adds a row of the record's own fields, growing with stored data. Both are sourced. **Growth is
therefore the weakest of the criteria and decides nothing on its own.**

**Not settled — where navigation belongs at narrow widths.** Carbon collapses its own header links
into the left panel, and places them above the panel's items when one already exists. Search sits in
the strip for five products and in the side for two, by product rather than by principle. So part of
this question is not "what kind of thing is it" but `collapse`, which the board already expresses.

## Refuse, or warn

**Refuse only what is provably broken.** An unbounded leaf with no bounded box under a `paged`
ancestor cannot be drawn. A `strip` holding a board has no way to lay out and zero instances in the
products measured.

**Warn about what is merely unusual.** A `split` inside a `split`, a board inside a `side`, a `rail`
holding something that grows — rare, none impossible.

A grammar that refuses too much is worse than none, because the refusals stay invisible until somebody
needs exactly the thing it will not say. This is the division the project already runs: `lint`
refuses, the surface tool advises.
