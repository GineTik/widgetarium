# The board is a tree

## TL;DR

A board's `layout:` is one recursive node: a leaf is a tile, a box is `{ dir, of }`, and a box holds
boxes. `left`, `main` and `right` are gone as names — the middle box carries `keep: true`, the ones
beside it `foldable: true` — and the grid's `layouts:` map of `{x, y, w, h}` places is gone as code.
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
{ dir: column, width: 280, foldable: true, of: [ ... ] }
```

| field | on | means |
|---|---|---|
| `dir` | box | `row` — children side by side; `column` — one under another |
| `of` | box | the children, in reading order |
| `ratio` | both | the share of the parent's direction |
| `height` | both | a fixed height in pixels |
| `width` | box | a fixed width in pixels, which is what a sidebar is |
| `keep` | box | this box may not be folded away, and the room left over is its own |
| `foldable` | box | this box can be folded; folded is `folded: true` |
| `scroll` | box | its own scroll container |

The root is a box. The three regions every board was born with read as:

```yaml
layout:
  dir: row
  of:
    - { dir: column, width: 280, foldable: true, of: [] }
    - { dir: column, keep: true, of: [ ... ] }
    - { dir: column, width: 280, foldable: true, of: [] }
```

## What moved from a name to a property

`keep` and `foldable` are the whole of what `main`, `left` and `right` meant. Every consumer now
addresses a box by its **path** — an array of indexes from the root — and `columnsOf`, `foldableIn`,
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

**A carry aims at a node, and the drop says what it means.** Every box and leaf on the board is
measured; the deepest one under the pointer wins. Along the parent's own direction the tile is
inserted as a **sibling**; across the grain it **wraps** the node it landed on in a fresh box of the
aimed axis. Wrapping is how a person makes a nested column by hand, so nesting needs no new gesture.

**The region element is a spot of its own.** A column is only as tall as its widgets, so the pointer
in the bare part of a sidebar would hit nothing. The `.wg-tree-region` element answers for the same
path as the box inside it, which is what makes the whole column a drop target.

**A move never loses a tile.** The carried leaf is replaced by a sentinel first and inserted second,
so a target path stays valid across the move; pruning then drops the sentinel, every empty box and
every box left holding one child — except a box that declares `keep`, `foldable`, `width`, `scroll`
or a `name`, because a declared empty box is a region and a region stays.

**Depth is not limited, but a node must be one of the two things.** `normalizeBoard` drops anything
that is neither a leaf with an id nor a box with an `of`, which is what stops a hand-edited file from
producing a shape the renderer cannot walk.

## Migration

Reading accepts three shapes, writing emits one.

| shape | where it came from | what happens |
|---|---|---|
| `layouts:` — column counts to `{x, y, w, h}` | the grid, oldest | read once: the widest authored width, places sorted by `y` then `x`, grouped into rows, `w` as ratio, `h` as pixels |
| `layout: { left, main, right }` | the three regions | read once into the root row |
| `layout: { dir, of }` | now | read and written |

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

## Still open

- `swap` — a box whose children share one place and whose `picks` names the active one, replacing
  `@core/view-group` — is a separate iteration. It needs an unmounted child to keep its refs alive,
  which is a question about the ref registry rather than about the layout.
- `size.w` handed to a widget is the tile's pixel width on this path while the manifest still counts
  cells; nothing reads it yet, and the two units have to be reconciled when something does.
