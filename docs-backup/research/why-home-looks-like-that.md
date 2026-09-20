# Why the Home screen looks like that

The Home board was drawn by hand and judged good. This traces every surface decision on it back to a law, names the two that the engine would make differently, and shows that both are the same missing signal.

Read against `src/surface-laws.js`, `src/surface-roles.js` and `docs/design-system.md` as they stand at `748628d`.

## The count

**Eleven surface decisions. Nine the engine already makes, by laws in the code today. Two diverge, and both are one signal.**

## Every decision, traced

### 1 · The left rail is `apart` — a dashed boundary, no plate

`DEFAULT_STYLE.navigation = [APART]` in `src/surface-roles.js:18`. The rail's box declares `role: navigation`, so `decided()` routes to `navigationVerdict` and the answer is `apart` before anything else is considered.

**The engine agrees.** Nothing was chosen here.

### 2 · The rail's rows wear nothing at all

`ALLOWED_INSIDE[APART] = [GROUP, OBJECT, APART]` — `item` is not in the list, so **a row inside an `apart` cannot be plated at all**. The pane's own boundary is the edge; a plate inside it would be the second, and two is the cap.

**The engine agrees.** This is also why the task list in the rail on the task screens, the outline on the docs screen and the queue on the music screen all look the same: they are all rows inside an `apart`, and the law leaves them exactly one way to be drawn.

### 3 · The active row is fill plus weight, never a plate

Selection is a state, not a surface — it is below the surface system entirely and no law in `surface-laws.js` touches it. Two channels, not one: `--wg-kit-fill-hover` **and** `font-weight: 600`. WCAG 2.2 SC 1.4.1 is normative that colour may not be the only visual means, and Obsidian's own `is-active` does exactly this — background *and* weight — which is where the pattern was taken from.

**Not a law yet.** It should be written down; nothing in the code says it.

### 4 · The warning block at the foot of the rail is a plate, in a tone

A tone does not make a new kind of surface. `--wg-kit-warning-wash` replaces the neutral fill on the same plate. The block earns a plate because it is a *different kind of thing* from the navigation above it — an alert, not a destination — and `mayWearInside(APART, GROUP)` permits it.

**The engine agrees**, once the tile declares `role: indicator`.

### 5 · Every band heading stands above its plate, never inside it

`headingReading()` at `src/surface-laws.js:243`:

> text wears no surface of its own, and first in a region it reads as the section title, **so every plate begins after it**

**The engine agrees**, and this is the same law that refused a `section-title` widget earlier in this project: a title is a markdown node standing beside the tile, and a title drawn inside the plate lands where the board cannot space it.

### 6 · "In flight now" is a grey group holding white item rows

`DEFAULT_STYLE.collection = [GROUP]`. The members come from `slotSurfaceOf` → `wornByReading`, which finds one collection prop, reads it as `WRAP_EACH`, and answers `ITEM`. An `item` on a `group` is the sanctioned pair — the only pair `ALLOWED_INSIDE[GROUP]` permits besides another group.

**The engine agrees, exactly.**

### 7 · The heatmap is a grey group around a single widget

This looked like a violation of P1 and is not. P1 reads:

```js
const inside = where.underSurface !== NO_SURFACE && role !== "composer";
if (inside && peersOf(walk, box, role) < 2) return nothing("P1", …);
```

**P1 only fires for a node that is already inside a plate.** The heatmap sits in a bare row inside a bare column, so `where.underSurface === NO_SURFACE`, `inside` is false, and P1 never runs. `DEFAULT_STYLE.indicator = [GROUP]` stands.

**The engine agrees.** The plate is right for a second reason the laws do not yet state: the heatmap's empty cell is drawn as a fill, and a fill that means *absence* vanishes if the ground behind it is the page. The plate is what makes "no tasks that day" legible as a value rather than as nothing.

### 8 · "Projects" is three white cards with no grey group — **divergence**

The engine would draw a grey `group` here, because `@flow/project-grid` declares `role: collection` and a collection's default surface is `GROUP`. It would look like "In flight now".

### 9 · The stat tiles are two white cards with no grey group — **divergence**

Same shape. `role: indicator` → `GROUP`. The engine would put a grey plate where the drawing has two white cards.

### 10 · A card on the page uses a hairline; a card on grey uses a fill

Not a decision at all. `docs/design-system.md`, law 1, states it:

> Fill, never outline. The one exception is arithmetic: on a light theme nothing is lighter than white, so a card on a container separates by `--wg-kit-card-edge` instead.

**It is one card, rendered against whatever ground it landed on.** This is why the project cards and the flight rows look like different components and are not — one is on white, one is on grey.

### 11 · The dock

Not in the tree. New, and confirmed as needed.

## The missing signal, stated once

Both divergences are the same set:

> **A plate is what gives a set an edge it does not have.**
>
> When each member already draws its own edge — a card, a tile, an image — the set's extent is visible without help, and a plate around it is an edge drawn twice.
>
> When the members are full-width strips or bare marks, they have no side edges at all, and the plate is what draws them.

Tested against every repeated set on the two screens:

| set | member | own edge? | plate? | drawn |
|---|---|---|---|---|
| Projects | a card with parts | yes | no | no ✓ |
| In flight | a full-width strip | no | yes | yes ✓ |
| Stat tiles | a card | yes | no | no ✓ |
| Activity heatmap | a mark | no | yes | yes ✓ |
| Album covers | an image | yes | no | no ✓ |
| Music groups | a card | yes | no | no ✓ |
| Every track | a full-width strip | no | yes | yes ✓ |
| Kanban column | a card on the column's plate | no | yes | yes ✓ |

Eight for eight, across two screens drawn days apart without the rule being written down.

## Where it lands in the code

**The vocabulary already has the word.** `object` is "a thing lifted off the page that a person acts in" — a member that carries its own edge. And `ALLOWED_INSIDE[GROUP] = [GROUP, ITEM, APART]`: **an `object` may not stand inside a `group`.** The moment a set's members are objects, the group around them is already illegal. The machinery is built.

**What is missing is the one function that could ever decide it.** `wornByReading` in `src/surface-roles.js:61` answers only `ITEM` or `NO_SURFACE`; it has no branch that returns `OBJECT`. And `DEFAULT_STYLE` offers `OBJECT` for exactly one role, `composer`. So today the engine cannot lay an object anywhere else, and therefore can never strip the group.

### The cheapest true signal

Tree-only, no measurement, so it can be a **gate** like N, 5 and N2 rather than advice:

- a collection laid **across** — `dir: row`, or a wrapping grid — has members with four edges of their own → **object** → the box wears nothing
- a collection laid **along** — `dir: column` — has members that are full-width strips → **item** → the box wears `group`

One exception, and the heatmap is it: **a member that is a mark rather than a tile has no edge in any direction.** A cell, a bar, a point. The widget is the only thing that knows, so the widget declares it — the same manifest field the empty-state research already concluded must be authored, because a skeleton has to resemble the widget it stands in for. A widget that draws marks says so, and gets its plate in either direction.

### The change

Add one law to `placed()`, before `N`:

```js
if (membersCarryTheirOwnEdge(walk, child))
	return nothing("P4", "every member here draws its own edge, and a plate around them is a second one");
```

`membersCarryTheirOwnEdge` reads the node's direction and the widget's card. Both are already in hand at that point; neither needs the board to have been drawn.

## The questions this answers

**Why does the outline look different from a card?** It does not. An outline row is a row inside an `apart`, where `ALLOWED_INSIDE` permits no plate at all. A card is a member with its own edge. Two different laws, two different results, one vocabulary.

**Why is the bug block red rather than grey?** A tone is a state of a plate, not a kind of plate. Same surface, `--wg-kit-error-wash` in place of `--wg-kit-fill`.

**Why does the task list in the rail carry no card?** Rule 2. It is inside an `apart`.

**Why is every group different?** They are not. Three laws applied to three different shapes of data: a navigation pane, a list of strips, a set of tiles. The variety is the data's, not the designer's.

## One correction to accept

`tail` should not have been proposed as a layout. A board's blocks carry no fixed position — any block may stand anywhere, and direction is all a box declares. Anchoring a collection at its end is a decision about how a widget fills its slots, so it belongs in the manifest beside the slot, not in the tree. `dock` survives, because a surface addressed against the window genuinely cannot be a node. `breakout` survives for now, but the same argument could shrink it to a slot property, and that is worth settling before it is built.
