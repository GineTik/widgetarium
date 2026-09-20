# Layouts in dense tools and games

Figma, Blender, DaVinci Resolve, Grafana, Datadog, game HUDs and inventories, Steam and Netflix. The densest UIs in existence, so they answer the extremes.

## The left/right law, stated in full

Figma follows it literally, and it generalises further than any other rule in this research.

> **A pane belongs on the left when its content is enumerable with nothing selected and acting in it *changes what is selected*.**
> **A pane belongs on the right when its content is a function of the selection and acting in it *changes the selected thing*.**

The corollary Figma obeys: **the left pane's contents survive an empty selection; the right pane's contents collapse to the container's own properties when the selection is empty.**

**Navigation is identity. Properties are state.**

Blender says the same with a mechanism: the Outliner activates a datablock, the Properties editor shows that datablock — and a **pin** toggle explicitly severs the follow-the-selection link so a second object can be compared.

Strategy games rotate the same law to top/bottom. Civ VI's top band carries the empire's whole state, unrelated to what is selected; the RTS bottom band carries everything about what *is* selected. The stated failure case is a game splitting commands across bottom, top and right, which "requires you to split your attention."

## The inspector, in three products

| | Grouping principle | Depth |
| --- | --- | --- |
| **Figma** | a facet of the object: geometry → structure → appearance → output | 2 (group → rows) |
| **Blender** | **who owns the data**: tool → scene → object → object-data → material | 3 (tab → panel → sub-panel → rows) |
| **Resolve** | the role of the media: Video / Audio / Effects / Transition / File | 2 + a tab strip |

**Nobody goes deeper than three.** Two mechanisms recur and are worth stealing: a **per-group enable and reset** affordance (Resolve), and a **pin** that breaks the selection binding (Blender).

Blender refuses to merge scene and object properties into one scroll **because they have different owners** — which is a sharper grouping rule than "related things go together".

## Areas that tile, and nothing that floats

Blender cuts the window into non-overlapping rectangles; each holds exactly one editor; they are split, joined and resized by dragging borders. **Nothing floats, nothing overlaps.** Every pane is simultaneously visible, and its size is the person's declaration of how much attention it deserves.

Above that sits a level this research found nowhere else: the **workspace** — a tab strip where each tab restores a complete arrangement of areas (Layout, Modeling, Sculpting, Shading, Animation, Compositing…). Resolve does the same with **pages** (Media, Cut, Edit, Fusion, Color, Fairlight, Deliver), each replacing the whole window.

**A workspace is never a filter on data; it changes only which editors are on screen.** And no page tries to be general — the Color page carries no timeline editor; the Edit page carries no node graph.

Resolve's Color page shows what happens when the task changes: grading compares shot to shot, so **the set of shots becomes a top strip rather than a left list.** The Media Pool's column form is abandoned there.

## What the equal cell buys, and when position carries meaning

A "Tetris" inventory is a fixed rectangle of equal cells; an item occupies a rectangle of whole cells. Path of Exile: 12×5 = 60 cells for the character, 12×12 = 144 for a stash tab.

**Capacity becomes a packing problem, so the size of a thing is felt as a cost.**

But position carries no *semantic* meaning there — **only occupancy does.** Position means something only when something external indexes the cell:

- a **key binding** — the hotbar, where slot *n* is key *n*, so arrangement is muscle memory
- a **body part** — the paper doll, where the slot *is* the meaning and the grid's freedom is deliberately removed
- a **status** — a kanban column

Diablo III's retreat to 1×1 and 1×2 items is the visible proof that a game can decide packing is not the fun part — capacity becomes a plain count.

## What earns the screen edge

A value that must be true **continuously** and that you must not look away from the centre to read: health, ammo, stamina, resource counts, the turn number.

**An edge rather than a pane because the pane costs the content its width permanently, whereas the overlay costs nothing while the eyes are central.** It is paid for in peripheral acuity — which is why edge elements are large, high-contrast, generously spaced, never multi-character text, and use motion to call for a glance.

Dead Space removed the edge HUD entirely and put health, ammo and inventory into the world on the suit, to "remove a wall of safety between the player and the game."

## The band stack, and what its order means

Steam's store page is a long vertical column of full-width bands, each a title plus a horizontally scrolling strip of equal-size cards. **Two independent axes with one hand: vertical moves between topics, horizontal moves within one topic, and neither costs a page load.**

Band order observed live, 2026-09-19: Featured & Recommended · Discounts & Events · Recommended Based on the Games You Play · Your Wishlist · DLC for Your Games · Popular New Releases · Top Sellers · Popular Upcoming · Specials · Trending Free · Browse by Category · Recently Updated · Top New Releases · The Community Recommends · Under 10€.

**The axis is how much of the row is derived from you** — personal first, then crowd facts identical to every visitor, then price-driven, then taxonomy, then long tail. Valve states the same ordering where it controls a layout end to end: a creator homepage runs **hand-picked first, automatic last**.

**Netflix publishes the reasoning.** Its homepage output "is not a single ranked list but a structured layout of rows and the entities within each row", tokenised "in layout order: left to right, top to bottom", with business rules imposing "structural constraints (e.g., organized as a list of rows)" including row pinning. Within a row, "the first few entities are especially important: they receive the most user attention and strongly shape the row's perceived quality". Rows are scored for **"stopping power"**.

**Neither uses a two-dimensional tile mosaic.** Band height is uniform; only the card aspect varies. Steam's *search results* drop bands entirely for a single vertical list with a left filter rail — because there the ordering is one ranked answer, not several topics.

## Numbers worth having

| Fact | Source |
| --- | --- |
| Grafana dashboard grid | **24 columns**, `h` in 30px units, negative gravity pulls panels up |
| Grafana auto grid | declares min column width, row height, **max 10 columns** |
| Grafana nesting | rows in rows, rows in tabs, tabs in rows; **tabs cannot nest in tabs**; up to four levels, six configuration levels |
| Datadog grid | **12 columns**, max widget width 12; high density = 2 × 12, never 24 |
| Datadog floors | timeseries ≥ 4 columns; log streams ≥ 6 columns |
| Blender indent | — |
| PoE inventory | 12 × 5 character, 12 × 12 stash |
| Panel-count limit | **none published** by either Grafana or Datadog |

Datadog's grouping advice is unusually strong: "It is recommended to always group related widgets together (even without a header), and even to always add widgets to a group, **even if they are the only widget in the group**."
