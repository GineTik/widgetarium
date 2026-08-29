# Adaptive layout — how others solve it

`RESEARCH` · 2026-08-28 · **decided and built**

## TL;DR

`minSize` is the wrong tool: it is a wall the layout cannot route around, so the board answers
it the only way it can — by dropping a tile to the next row, which reads as the interface
vanishing. Nobody who has shipped this uses minimums as a hard constraint. Apple removed
free resizing entirely and ships fixed size families; gridstack keeps free resizing but gives
each widget a named **reflow strategy** and caches the widest layout as the source of truth.
Recommendation: take gridstack's strategy model for the board, container queries for the
widget's insides, and demote the minimum to a hint we already cap.

---

## 1. The defect, named

Three separate mechanisms produce what looks like one bug.

**A tile falls to the next row.** A minimum is a hard floor, so when a row no longer fits, the
board cannot shrink the tile and must move it. Half the screen appears to disappear. The user
who wrote the feature did not recognise it as intended behaviour — that is the measurement
that matters.

**The collapsed sidebar re-opens by itself.** Verified in the live board file: it holds four
layouts (13, 14, 17, 20 columns) and `restoreW` appears in **two** of them. Collapsed-ness is
stored per width, as geometry. Resize to a width whose layout was authored before the collapse
and the sidebar comes back expanded — it is not fighting, it is being asked a different
question at every width.

**A collapsed tile grows when the window does.** Derivation scales every tile by the column
ratio, including one whose whole point is that it is 1 wide.

| what it is | where we keep it | what happens |
|---|---|---|
| geometry (x, y, w, h) | per column count | correct |
| collapsed / expanded | per column count — **wrong** | re-opens on resize |
| "never grow with the board" | nowhere | grows anyway |

---

## 2. Prior art

### Apple — delete the problem

WidgetKit widgets come in fixed families (small 169×169, medium 360×169, large 360×376 pt).
The developer does not write a minimum because there is nothing to constrain: they design
*for* a size. Apple's guidance is explicit that supporting only one family is fine, and that a
larger family should be a different design rather than a scaled-up one. iOS 18 added corner
dragging, but it snaps between the same families.

**What this buys:** no reflow logic, no minimums, no surprises. **What it costs:** the author
draws N layouts, and the board can only offer sizes somebody has drawn.

### gridstack — name the strategy

When the column count changes, gridstack applies a per-grid (and overridable per-widget)
strategy:

| strategy | position | size |
|---|---|---|
| `none` | unchanged | unchanged unless it overflows |
| `move` | repositioned | unchanged |
| `scale` | unchanged | scaled by the ratio |
| `moveScale` | scaled | scaled — our current behaviour |
| `list` | kept in order, sequential | unchanged unless too big |
| `compact` | reordered to close gaps | unchanged |

Two details matter more than the list. First, **the widest layout is cached and kept as the
source of truth** — a 12-column layout is retained while rendering 1 column, so narrowing and
widening is lossless. Second, gridstack **stopped defaulting to one-column mode** because "too
many new users had issues" — the same complaint, from the same cause, in a mature library.

### react-grid-layout — the honest failure

Per-breakpoint layouts, no strategy. Its long-standing open issue is exactly ours: shrink past
a breakpoint and grow back, and items do not return to where they were. There is no fix in the
library; the advice is to re-key the grid or drive it from drag/resize handlers. **This is the
model we currently implement.**

### Container queries — move the problem into the widget

`container-type: inline-size` plus `@container` lets a widget restyle itself from **its own
box**, not the viewport. The canonical example is ours: a dashboard card that shows full detail
in a large cell and a compact summary in a small one, one component, no JavaScript. A widget
that does this has no minimum to declare — it is never handed a box it cannot draw in, because
it draws whatever it is handed.

---

## 3. What this says about our model

We built react-grid-layout's model and inherited its known failure. The cap we just added
(no minimum above 4 columns) stops the wall from being infinitely high but leaves the
mechanism. The three things prior art has that we lack:

1. **A per-widget answer to "what happens when the board changes size"** — we apply `moveScale`
   to everything, including a folded panel that should answer `none`.
2. **One authored layout as the source of truth**, with the rest as projections — we author
   every width the user touches, so the same board has four disagreeing opinions.
3. **Widgets that adapt to their box**, so the minimum is advisory rather than structural.

---

## 4. Options

### A — Strategies (gridstack's model)

Each widget declares how it answers a size change: `fill`, `keep`, `scale`, `follow`.

| widget | state | strategy |
|---|---|---|
| sidebar | expanded | `fill` up to its max |
| sidebar | collapsed | `keep` — never grows with the board |
| kanban | — | `fill` — takes the freed columns |
| tab bar | — | `follow` — matches the row it belongs to |

- **For:** answers the sidebar case exactly; proven; strategies are readable words, not numbers.
- **Against:** one more thing for a widget author to think about — the user's stated fear.
- **Mitigation:** a default (`fill`) that is right for most widgets, so the field is optional
  and only a panel that folds ever sets it.

### B — Size families (Apple's model)

Widgets ship 2–3 drawn sizes; the board snaps to them and never invents one.

- **For:** nothing can look wrong, because every size was drawn by a person.
- **Against:** kills free resizing, which is the editor's whole appeal; N layouts per widget is
  more author work than one strategy word, not less.

### C — Container queries, minimums deleted

The board never refuses a size. The widget restyles itself at whatever width it gets.

- **For:** removes the concept the user finds unintuitive; nothing to learn; a widget written
  this way is portable to any site, which is the open-source pitch.
- **Against:** does not decide *who gives up columns* when a row is short. Necessary, not
  sufficient.

### D — Recommended: C as the law, A as the exception

1. **Delete `minSize` as a constraint.** Keep it as an advisory used only to seed a new tile's
   first size. The board never refuses a width.
2. **Widgets adapt with container queries.** Publish it as the contract: *your widget will be
   handed any width; make it readable.* This is a promise to developers, not a rule for them.
3. **Add one optional field, `onBoardResize`,** with `fill` as the default. A folded panel sets
   `keep`. That is the whole surface area.
4. **Move collapsed-ness off the place and onto the tile.** It is a state of the widget, not a
   fact about one screen width. This alone fixes the re-opening sidebar.
5. **One authored layout, the widest, as the source of truth.** Others are projections unless
   the user edits them. Narrow-then-widen becomes lossless, which is gridstack's actual
   advantage over react-grid-layout.
6. **Animate the transition.** The user's own diagnosis: a tile that moves *instantly* reads as
   a bug, and the same move at 200ms reads as a layout. Cheap, and it is the difference between
   "my screen vanished" and "the board rearranged".

---

## 5. What it costs a widget author

The stated goal is that a developer installs a widget and uses it. Under D:

| how often | what the author does |
|---|---|
| always | nothing — the defaults are right |
| sometimes | write `@container` rules if the widget is dense |
| rarely | set `onBoardResize: "keep"` for a panel that folds |
| never | declare a minimum or a maximum |

Compared with today, where a wrong `minSize: 9` silently breaks somebody else's board.

---


---

## 7. What was decided, and what shipped

The model below is live. `minSize`, `maxSize` and `collapsedSize` are gone from every manifest
and from the engine.

| was | is | why |
|---|---|---|
| `minSize` | `defaultSize` | it never constrained anything after birth, so the name was a lie |
| `maxSize` | — deleted | same wall, other end |
| six strategies | `growth: fill \| keep` | shrinking is shared; only GROWING needs an answer |
| a tile falling to the next row | a chip, opened in place | Priority+ for what, container transform for how |
| `restoreW` per layout | `folded` on the tile | folded is one fact about a widget, not one per screen width |
| CSS that guessed at the board | `@container` in pixels | a widget answers for its own box and knows nothing about columns |

**What a widget author does now:** nothing. `defaultSize` is where the tile is born,
`growth` defaults to `fill`, and `collapseBelowPx` is the one number worth thinking about —
the width below which the widget would rather show a chip than a squashed version of itself.

**What the board promises:** it will never refuse a width, and it will never move a tile to
another row to honour a widget's opinion.

Files written in the old shape still open: a place carrying `restoreW` is read as a folded
tile, once, and written back in the new shape.

## 8. Open questions

- Should a projected layout be written to the file at all, or held in memory until edited?
  Writing it is what makes four disagreeing opinions possible.
- At three columns the board stacks vertically. Is stacking right, or should the phone get a
  swipe between columns, as discussed?
- Does `onBoardResize` need a vertical answer too, or is height always `follow`?

## Sources

- [gridstack ColumnOptions](https://gridstackjs.com/doc/html/types/ColumnOptions.html)
- [gridstack responsive docs](https://gridstackjs.com/doc/html/interfaces/Responsive.html)
- [react-grid-layout issue #1663 — does not pop back when growing](https://github.com/react-grid-layout/react-grid-layout/issues/1663)
- [Designing for iOS 14 Home Screen Widgets](https://www.adapptor.com.au/blog/designing-for-ios-14-home-screen-widgets)
- [WidgetKit size families](https://www.oreilly.com/library/view/swiftui-essentials/9781801813228/WidgetKit_Size_Families.xhtml)
- [CSS Container Queries — CSS-Tricks](https://css-tricks.com/css-container-queries/)
