# The board is a tree

## TL;DR

A board's `layout:` is one recursive node: a leaf is a tile, a box is `{ dir, of }`, and a box holds
boxes. `left`, `main` and `right` are gone as names — the middle box carries `keep: true`, the ones
beside it `collapse: { into: drawer, toggle: always }` — and the grid's `layouts:` map of `{x, y, w, h}` places is gone as code.
Reading still accepts both older shapes and turns them into the tree once; writing only ever emits
the tree, stamped `v: 2`.

## Why

A cell used to be a row with a tile id in it, so a region was rows of cells and nothing deeper. That
made this expressible:

```
main: [[A], [B, C]]
```

and this not:

```
main: [[A], [B, [C over D]]]
```

Any sub-area needing its own stack inside a horizontal split was unreachable, which blocked every
screen of the shape "calendar plus a detail panel that holds a title, properties under it and
subtasks under those". `src/tree.js` carried the note as a TODO — column groups inside a row, no
board needs one yet. One did.

## The model

A **node** is one of two things.

**A leaf** is a tile, and its shape did not change, so an old cell reads without a branch:

```yaml
{ id: w3, ratio: 2, height: 320 }
```

**A box** is a container:

```yaml
{ dir: row, ratio: 1, of: [ <node>, <node> ] }
{ dir: column, width: 280, collapse: { into: drawer, toggle: always }, of: [ ... ] }
```

| field      | on   | means                                                                                                                                                                                                                                                                                                       |
| ---------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dir`      | box  | `row` — children side by side; `column` — one under another                                                                                                                                                                                                                                                 |
| `of`       | box  | the children, in reading order                                                                                                                                                                                                                                                                              |
| `ratio`    | both | the share of the parent's direction                                                                                                                                                                                                                                                                         |
| `height`   | leaf | a fixed height in pixels; a box is as tall as what it holds                                                                                                                                                                                                                                                 |
| `width`    | box  | a fixed width in pixels, which is what a sidebar is                                                                                                                                                                                                                                                         |
| `keep`     | box  | this box may not be folded away, and the room left over is its own                                                                                                                                                                                                                                          |
| `foldable` | box  | read only: becomes `collapse: { into: drawer, toggle: always }`                                                                                                                                                                                                                                             |
| `collapse` | box  | `{ into, toggle }`: `into` is what it becomes when it does not fit — `stack`, `drawer`, `sheet`, `menu`, `hide`; `toggle` is when its header button exists — `always`, or `adaptive` (default, only while collapsed); a bare kind is short for `{ into: kind, toggle: adaptive }`; folded is `folded: true` |
| `trigger`  | box  | the ref of the `@default/toggle` that opens it, such as `t1/open`; without one a button appears in Obsidian's header                                                                                                                                                                                        |
| `scroll`   | box  | its own scroll container                                                                                                                                                                                                                                                                                    |
| `surface`  | both | `fill`, `outline`, `divider` or `none`; absent is `none`, except a sidebar holding something, which is divided                                                                                                                                                                                              |
| `side`     | both | which side a `divider` stands on, `start` or `end` along the parent                                                                                                                                                                                                                                         |
| `role`     | box  | what the group is, from the closed list in `src/surface-roles.js`; a leaf takes its role from its widget's manifest                                                                                                                                                                                         |
| `purpose`  | box  | the one question the group answers                                                                                                                                                                                                                                                                          |

The root is a box. The three regions every board was born with read as:

```yaml
layout:
  dir: row
  of:
    - { dir: column, width: 280, collapse: { into: drawer, toggle: always }, of: [] }
    - { dir: column, keep: true, of: [...] }
    - { dir: column, width: 280, collapse: { into: drawer, toggle: always }, of: [] }
```

## What moved from a name to a property

`keep` and `collapse` are the whole of what `main`, `left` and `right` meant. Every consumer now
addresses a box by its **path** — an array of indexes from the root — and `columnsOf`,
`isFolded`, `toggledFold`, `sidebarWidth` and `widenedBox` all answer about an index, not a name.
`sideOf(root, at)` turns a path into `left` or `right` for an icon name and an aria label, and that
is the only place a side is spelled out.

## The rules the implementation settled

**A drawer is the root's business.** `columnsOf` applies to the root's own children only: below
`MAIN_FLOOR_PX` a sidebar becomes a drawer over the whole window, which is meaningless for a box
nested three levels down. A deeper box that runs out of width **stacks** — the same rule the old
`layTree` had for a row, now applied at every level.

**Stacking is recursive.** A row whose child would be drawn under its declared floor
(`stackBelowPx`) is laid out as a column instead, and each child is laid out again at the full
width. A box's floor is the largest floor among its leaves, because any box can stack.

**A height belongs to the widgets.** Only a leaf carries `height`; a row that kept its own pixels
once stacked into a column still held to them and spilled over every box below. A grip resizes the
line above it. Under a row standing whole that line is the row, and every widget in it, however
deep, gets one height: the tallest plus the pull. Inside that line a column grows or shrinks each
child by the share it already took, and a swap does it to the view on screen. Under a box drawn as a
column — a stacked row, a column, a swap — the box draws no grip of its own, because its last widget's
grip is already there; a widget's grip always wins. No widget passes its own floor or ceiling to pay
for it.

**A height is kept per arrangement.** `height` is the height while the widget's row stands whole —
however many children that is today, so a fifth widget changes nothing. `heights: { 1: 180, 2: 140 }`
holds the height while the row stands `n` across (a stacked row is `1`); a missing `n` reads the
nearest wider one, then `height`. A resize writes only the arrangement drawn, so a phone never
overwrites the desktop. Carried into another box the widget keeps `height` and drops `heights`,
whose counts meant the old box.

**A gap stands between siblings, never after the last.** The last child of a column carries a grip
that takes no room and lies over its bottom edge; the add press keeps the column's step above it. A note still carrying a box `height` is read once by `handedDown`: a row or swap hands it to
every widget that had none, a column shares what its gaps and fixed widgets leave, and the first
write drops the key.

**A carry aims at a node, and the drop says what it means.** Every box and leaf on the board is
measured; the deepest one under the pointer wins. Along the parent's own direction the tile is
inserted as a **sibling**; across the grain it **wraps** the node it landed on in a fresh box of the
aimed axis. Wrapping is how a person makes a nested column by hand, so nesting needs no new gesture.

**The region element is a spot of its own.** A column is only as tall as its widgets, so the pointer
in the bare part of a sidebar would hit nothing. The `.wg-tree-region` element answers for the same
path as the box inside it, which is what makes the whole column a drop target.

**A move never loses a tile.** The carried leaf is replaced by a sentinel first and inserted second,
so a target path stays valid across the move; pruning then drops the sentinel, every empty box and
every box left holding one child — except a box that declares `keep`, `collapse`, `width`, `scroll`
or a `name`, because a declared empty box is a region and a region stays.

**Depth is not limited, but a node must be one of the two things.** `normalizeBoard` drops anything
that is neither a leaf with an id nor a box with an `of`, which is what stops a hand-edited file from
producing a shape the renderer cannot walk.

## Migration

Reading accepts three shapes, writing emits one.

| shape                                        | where it came from | what happens                                                                                                        |
| -------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `layouts:` — column counts to `{x, y, w, h}` | the grid, oldest   | read once: the widest authored width, places sorted by `y` then `x`, grouped into rows, `w` as ratio, `h` as pixels |
| `layout: { left, main, right }`              | the three regions  | read once into the root row                                                                                         |
| `layout: { dir, of }`                        | now                | read and written                                                                                                    |

Both conversions happen inside `normalizeBoard`, so no consumer below it has ever seen an older
shape. Nothing bulk-rewrites the vault: a board is rewritten as a tree by the first edit a person
makes to it.

`BLOCK_FORMAT` went to 2 with this change. A board written as a tree cannot be read by the plugin
that only knew the three regions — it would find no layout, draw the tiles in the grid instead and
drop `layout:` on the next write — so the old plugin has to refuse it, and the refusal is what `v`
is for.

## What was deleted

`src/layout.js` (the grid's `arrange`, `clampPlace`, `toPixels`, `toCells`, the fitting and packing
arithmetic), `src/chip.js` and the tile chrome that only the grid drew — `TileView`, the eight resize
grips, the cell layer, auto-fit, the column-count state chip, the widget palette, and the Design
tab's width and height in cells. Their suites went with them: `scenario`, `invariant`, `collapse`,
`resize`, `drag`, `chip` and `check-one-law`. `spanToPixels` moved to `src/paths.js`, where the grid
metrics the catalogue and the settings window still draw cards against already live.

## Swap: views as a box

```yaml
{
  dir: swap,
  id: views,
  strip: false,
  of: [{ id: w3, name: Board }, { dir: column, of: [], name: Later, hidden: true }],
}
```

**Every view is a tile, and every tile stays mounted.** The children are laid out at the box's width
and the ones off screen are drawn under `hidden`. That answers the question the group could not: a
view's refs live only while its widget is on the tree, so an unmounted view took its refs with it.

**The box publishes, the note holds names.** `<id>/holds` is a read-only collection of the children
as rows; `<id>/selection` is a view cell. Which view is shown is screen state, the same as it was in
the group, so a tab press writes nothing. A box without an `id` still swaps and publishes nothing.

**One law over rows.** The strip's steps go through `applyTabStep`, and `withHolds` maps the rows
back onto the children by name, carrying `was` for a rename. An added row is an empty named column,
which draws the press that fills it. A deleted row removes its subtree, and `commitHolds` drops the
tiles under it in the same write.

**A drop into a swap box wraps.** A child of a swap box is a named view and a drop names nothing, so
a carry over the box falls through to the view on screen, and a carry over that view reads across a
direction the box does not have — it always wraps. `wrapping` lifts `name` and `hidden` onto the
wrapper, because they describe the child's place, not its content.

**Migration.** A placed `@default/view-group` tile becomes a swap box with the group's id; its
`mounts.holds` rows become children, its `mounted` records become tiles with ids
`<groupId>:<name>`, a row with no widget becomes an empty named column, and `isTabsShown: false`
becomes `strip: false`. Names come from `nameOf`, which is `declaredName` in the plugin — so the read
must happen after the registry loads. A group that is not placed is left as a tile. Wiring seeds
`@default/view-group` with every swap box's id, so a manifest that `wants` the group's holds binds to
the box.

**What changed for a person.** Folding views into a group no longer invents a second view from a
holder's default list; the box holds the views that were on the board, and the strip's Add makes the
next one. Renaming onto a taken name is refused by the strip and the typed text is put back.

## Still open

- `@default/view-group` still ships in `widgets/@default/`. Nothing places it, a board holding it is read as
  a box, and the mount machinery it was the only consumer of is now proved against a probe holder in
  `mount-test`. Deleting the folder, its catalogue card and its row in `tools/widget-props.json` is
  the next step.
- `size.w` handed to a widget is the tile's pixel width on this path while the manifest still counts
  cells; nothing reads it yet, and the two units have to be reconciled when something does.
