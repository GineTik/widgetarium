# Spec — the three restrictions (A + C + E)

`SPEC` · 2026-08-28 · decided from [[widget-scaling-research]]

## TL;DR

Three rules, and **none of them touches `arrange`**. **E** puts the chrome — tabs, rails,
toolbars, scrollers — into `widgetarium` so a widget author never writes adaptivity again.
**A** brings `minSize` back as a bound on the resize grip and nowhere else. **C** stacks the
board below a pixel threshold into a stack of three width classes, without writing that layout
to disk. Ship E
first: it fixes everything visible in the screenshots and is the only one that touches widget
code.

## Why these three

Measured against prior art: no shipping widget system hands a third-party widget an arbitrary
size and expects it to look right. Apple restricts the size set and the toolkit (three
families, SwiftUI subset, no scrolling, no interactivity). Android restricts the toolkit
(RemoteViews takes nine layout types and refuses `ScrollView`) and asks for 2–4 declared
layouts. Home Assistant lets a card declare `min_columns` and honours it in the resize UI.
Grafana drops the grid below a breakpoint. We restrict nothing, so the whole cost lands on the
widget author.

**B (size families) is rejected:** it costs an author more than A — three drawn layouts
instead of one number — and removes the free resizing that is this editor's reason to exist.

---

## The law, one sentence each

| | law | owner |
|---|---|---|
| **A** | A tile may not be dragged narrower than its `minSize`. | the grip |
| **C** | Below `stackBelowPx` the board is not a grid: tiles flow in reading order at one of three width classes. | the board |
| **E** | A widget does not draw chrome; it composes kit components, and the kit adapts. | `widgetarium` |

**The invariant that survives all three:** `arrange` never learns a widget's opinion about its
own size. That is what made row-dropping possible last time, and it is what we are not
rebuilding.

---

## A — the grip stops at the floor

### What changes

`manifest.json` gains an optional `minSize: { w, h }`. Default: absent, meaning 1×1.

```
src/surface.js   resizeBy()  ->  clamp the SNAPPED span to minSize before settle()
src/model.js     normalizeTile  ->  carry minSize through, default null
```

That is the whole change. `minSize` is passed to `TileView` for the grip, and to nothing else.

### What must NOT change

- `arrange()` receives no new argument and no new intent. A grep for `minSize` outside
  `surface.js` and `model.js` is a defect.
- **A screen that narrows may still take a tile below its floor.** That is deliberate: below
  the floor the tile renders as the chip we already ship (`collapseBelowPx`). The floor bounds
  a *person's drag*, not the window's width — the moment it bounds the window, row-dropping
  comes back.

### Where the numbers come from

`minSize.w` is the width below which the widget's own compact design stops being readable —
which is the same number as `collapseBelowPx`, expressed in cells. Authors set one or the
other, never both; the manifest check rejects a widget declaring both.

---

## C — a flow below the threshold

### What changes

```
src/paths.js     GRID.stackBelowPx = 460      (starting value, to be confirmed on device)
src/paths.js     measureGrid()  ->  returns { ..., stacked: availableWidth < stackBelowPx }
src/surface.js   when stacked: places are DERIVED, never authored
```

### What "stacked" means, precisely

**It is not one column.** That rule was written against the task board — three wide tiles and
two controls — and it is wrong for anything else. Six compositions, of which two broke it
([[boards-that-break-it]]): a dashboard of eight equal metric tiles became eight enormous rows
holding one number each, and a strip of eight tools became eight rows holding one icon each.

The stack is a **FLOW over three width classes**, filled in the **authored reading order** —
the order tiles appear in `board.tiles`, not their `y`.

| class | when | span |
|---|---|---|
| `full` | authored width ≥ 2/3 of the board | the rest of the row |
| `half` | authored width ≥ 1/3 | `floor(columns / 2)`, so two per row |
| `control` | the kit collapsed it to a single button | 1 cell |

- A tile is a **control** when its kit reports a single-control state (`Rail` at its
  menu-button rung, `IconTile` always). Nothing declares this in a manifest — the kit knows.
- **Controls fill a row left to right and wrap at the board edge** among themselves. This is
  the half of the rule board 5 was missing.
- A `full` tile takes `columns − (controls already on the row) − (controls queued behind it)`,
  so a control never pushes the tile it belongs beside onto another row.
- Height is the tile's authored `h`, unchanged.

Measured on the two boards that broke: metrics 11 rows → 5, control strip 9 rows → 2.
- The gap drops to `gapNarrowPx / 2` and the pad to 8px. This is the "прибрати пусті простори
  на телефоні" ask, and it belongs here rather than as its own feature.
- **Nothing is written to disk.** The stacked arrangement is derived on every render and the
  authored layout for every column count is untouched. Writing it is exactly the
  react-grid-layout defect where a shrink-then-grow loses the layout.
- Editing is off while stacked: no grips, no drag, no Auto-fit. A person cannot author a
  layout that does not exist.

This is why **E ships before C**: without the kit there is no answer to "has this collapsed to
one button?", and C can only stack dumbly — a folded sidebar would eat a full row, which is the
wasted space C exists to remove.

```
   the flow                                 one column per tile
   ┌───┬─────────────────────┬───┐          ┌───────────────────────────┐
   │ ☰ │ Marketing Team  +2  │ ▽ │          │            ☰              │  ← a row for one button
   ├───┴─────────────────────┴───┤          ├───────────────────────────┤
   │ Kanban  Table  Timeline +1  │          │ Marketing Team  +2    │ ▽ │
   ├──────────────┬──────────────┤          ├───────────────────────────┤
   │ Open   128   │ Overdue   14 │  halves  │        Open      128      │
   ├──────────────┼──────────────┤          ├───────────────────────────┤
   │ Done    61   │ Cycle   3.2d │          │        Overdue    14      │
   ├───┬───┬───┬──┴┬───┬───┬───┬─┤          ├───────────────────────────┤
   │ + │ ⌕ │ ▽ │ ⇅ │ ⌗ │ ○ │ ! │…│ controls │             +             │
```

### Re-entry

Widen past the threshold and the authored layout for that column count returns unchanged,
because it was never overwritten. This is testable without Obsidian and is the single most
important test in this spec.

---

## E — the kit owns the chrome

The largest of the three, and the one that pays the author back.

### The four components

Exported from `src/api.js` on the `widgetarium` object — the only import a widget is allowed
besides preact.

| component | replaces | degradation ladder, widest → narrowest |
|---|---|---|
| `Tabs` | hand-rolled tab bars in `board-tabs`, `view-tabs` | all labels → labels that fit + `+N` → a select showing the active one |
| `Rail` | the sidebar's nav list | icon + label → icon only → one menu button opening an overlay |
| `IconTile` | the filter button | always fills its tile: tile radius, tile height, centred glyph |
| `Scroller` | nothing yet; the kanban's columns | horizontal scroll for content that must not collapse |

Thresholds are **measured with the six-width harness, not guessed.** Starting values:
`Tabs` → select under 150px; `Rail` → icons under 96px, menu button under 62px. Each is a
constant in one file, and each is a number the harness prints.

### The rule that outranks the others

**A widget may never DROP content to fit. It reflows it, or it scrolls it.**

Measured on the stress boards: the kanban was hiding its "Done" column below 435px and the
board looked fine, which is the worst failure of the three — a clipped label is visibly wrong,
a missing column is invisibly wrong. A column keeps a floor (`132px` in the demo) and the tile
scrolls past it. Same for a table's columns, a canvas's panels, a list's rows.

This is why `Scroller` is not a nice-to-have: without it, "make it fit" and "tell the truth"
are in conflict, and every author resolves that conflict differently.

### The rule the kit enforces

**A widget's own CSS may not set `border-radius`, `border`, `height` or `padding` on anything
the kit provides.** The kit owns them, so every widget agrees with every other widget — which
is the whole complaint about the screenshots. A widget styles its *content*; the kit styles
its *chrome*.

Vertical centring is a kit rule, not a per-widget one: kit chrome is centred in its tile. The
tab bars painting at the top of their tile is fixed once, here.

### Migration

Three widgets change: `board-tabs`, `view-tabs`, `kanban-board`. Each
loses its own tab/rail markup and CSS and composes the kit instead. Net: less widget code than
before, which is how we know E is the right shape.

---

## What this does NOT do

- No vertical push, no gravity, no auto-fill. Auto-fit stays a button.
- No `maxSize`. It is the same wall at the other end.
- No per-breakpoint authored layouts. Layouts stay keyed by column count.
- No change to `arrange`, `layoutFor`, or the ownership of position.

---

## Verification

### What I prove without Obsidian

| test | proves |
|---|---|
| `tools/drag-test.mjs` (extend) | the grip stops at `minSize.w`; a board with no `minSize` behaves exactly as today |
| `tools/stack-test.mjs` (new) | below the threshold every tile is full width in reading order; **the authored layout on disk is byte-identical before and after**; widening restores it |
| `tools/kit-test.mjs` (new) | each ladder switches at its threshold, in both directions, and never renders clipped text |
| `tools/check-kit.mjs` (new gate) | no widget CSS sets radius/border/height/padding on a kit class |
| `npm test` | the existing 459 checks still pass — A and C must be invisible to them |

### What a person checks in the app

1. Drag the sidebar's right edge left in a real note: it stops, and the tile does not jump.
2. Narrow the Obsidian pane past the threshold: the board stacks, gaps tighten, grips vanish.
3. Widen it back: **the layout is exactly as authored** — this is the one that has burned us.
4. Collapse and expand the sidebar twice: it returns to the width it had.
5. On a phone, open the same note: the flow, no wasted gutters, and metric tiles two to a row.

---

## Order of work

1. **E — the kit.** Fixes what is on screen now, and C depends on it: only the kit can say
   whether a tile has collapsed to a single control.
2. **A — the grip clamp.** Two files, one clamp.
3. **C — the stack.** One threshold, one derived path, and the no-write test.

Each lands as its own branch and PR against `dev`.

---

## Settled by the stress boards

- **`Scroller` ships in the first cut.** A table has an honest minimum width; without a
  scroller the only choices are clipping it or showing four columns and calling it the data.
  The kanban proved the same thing more sharply by silently hiding a column.
- **The width classes are derived, never declared.** A widget does not say "I am a half" —
  its authored width and its kit state say it.

## Open questions

- **Height is untouched by the stack, and that may be wrong.** Six full-width tiles keep every
  authored height, so the reading board becomes a very long phone scroll. Grafana and Apple
  both keep heights and I found no product that compresses them, so I am not inventing one —
  but it is the next thing to measure on a device.
- `stackBelowPx = 460` is a starting number. It must be measured against the real cell size,
  because the board already varies its target cell from 84px to 68px across widths.
- Should `minSize` be expressed in cells or in pixels? Cells match the grid; pixels match
  `collapseBelowPx` and survive a change to the target cell size.
