# The board

## The note

A board lives in a fenced code block inside an ordinary markdown note:

````markdown
---
widgetarium: { kind: screen }
id: 0c9f4a1e-...
---

```widgetarium
v: 2
tiles: []
mode: expanded
layout:
  dir: row
  of:
    - { dir: column, of: [], foldable: true }
    - { dir: column, of: [], keep: true }
    - { dir: column, of: [], foldable: true }
```
````

The frontmatter mark `widgetarium: { kind: screen }` makes the note a screen — the board takes the
whole page. Without it a board is a block sitting inside somebody's prose and stays the size it is
given. `mode: expanded` is the same decision written on the board itself.

**A note can hold more than one board.** Each fenced block is its own.

**Saving the note is what draws it.** The plugin re-reads the block on every file change. That is
why you place one widget and save, then the next and save.

## The block

```yaml
v: 2
tiles:
  - id: w0
    widget: "@default/metric-total"
    props:
      title: { from: typed, value: Revenue }
      records: { from: vault, path: Metrics }
  - id: w1
    widget: "@core/editable-tabs"
mode: expanded
layout:
  dir: row
  of:
    - { dir: column, of: [], foldable: true }
    - dir: column
      keep: true
      of:
        - { id: w1 }
        - { id: w0, height: 320 }
    - { dir: column, of: [], foldable: true }
```

- `v: 2` is the block format. Copy whatever is already in the file; never raise it yourself. A block
  written in a format newer than the plugin is refused rather than migrated, and the person sees a
  message instead of their screen.
- `tiles` is the flat list of what is on this board. A tile's `id` is any string unique in the
  block; `w0`, `w1`, `w2` is the convention.
- `widget` is the widget id, which is `@pack/name` and is also its folder under
  `.widgetarium/widgets/`.
- `layout` is the tree that says where each tile stands. A tile in `tiles` but not in `layout` is
  not drawn.

## The layout tree

`layout` is a **node**, and a node is one of two things.

A **leaf** names a tile:

```yaml
{ id: w0, ratio: 2, height: 320 }
```

`ratio` is its share of the space along the parent's direction, default `1`. `height` is pixels, and
only where a fixed height is genuinely wanted.

A **box** holds other nodes:

```yaml
dir: column          # "row" or "column"
of: [ ... ]          # the children, in order
ratio: 1             # its own share of its parent
height: 400          # pixels, optional
width: 280           # pixels, optional
keep: true           # this box is never folded away — the main region
foldable: true       # this box can be folded shut — a sidebar
folded: true         # it starts folded (only meaningful with foldable)
scroll: true         # it scrolls on its own
name: Filters        # a label, presentation only
```

Boxes nest to any depth. `[[A], [B, [C over D]]]` is a row of two columns, the second holding B
above a row of C and D. That is the whole point of the tree: three fixed regions could not say it.

The root of a new board is a row of three boxes — a foldable sidebar, a `keep` middle, a foldable
sidebar. There is nothing magic about `left`, `main` and `right`: those names are gone, and the only
thing that makes a box a sidebar is `foldable: true`. **A box with an empty `of` is still a real
region** — a person can drop a tile into it. Do not delete the empty sidebars from a new board.

An older note may hold `layout: { left, main, right }` or a `layouts:` map of `{x, y, w, h}` places.
Both are read and converted the first time the board is written. Do not author either.

## Placing a tile

Adding a widget to a screen is two edits in one save:

1. Append a record to `tiles`.
2. Append a leaf naming its `id` to the box it should stand in — almost always the `keep` box.

```yaml
tiles:
  - id: w2
    widget: "@default/metric-total"
layout:
  dir: row
  of:
    - { dir: column, of: [], foldable: true }
    - dir: column
      keep: true
      of:
        - { id: w0 }
        - { id: w2 }     # the new one, at the end
    - { dir: column, of: [], foldable: true }
```

Save. The person sees it appear. Then bind it.

## Binding a prop

Every value a widget reads is a **gateway**, and the tile says what it is bound to. Three shapes,
and the shape is what says which:

```yaml
props:
  records: { from: vault, path: Metrics }            # a folder of notes, or one note
  title:   { from: typed, value: Revenue }           # a value living in the tile itself
  period:  { from: ref, ref: "w1/tabs" }             # another tile's prop
```

- **`from: vault`** — `path` is a vault-relative folder (a collection: every note in it is a row) or
  a single `.md` file (a value). This is the binding that makes a screen real. A board whose tiles
  are all `typed` is a mock-up, not a screen.
- **`from: typed`** — the value sits in the block. For a collection prop the value is a list of
  objects; for a value prop it is a primitive whose type the manifest names (`text`, `number`,
  `boolean`).
- **`from: ref`** — `ref` is `<tileId>/<propName>`, and it points at the gateway another tile
  exposes. This is how a tab strip drives the widgets below it: the strip owns the list and the
  selection, and each widget below reads through a ref to it. There is no shared bus and no context;
  a ref is the only way two tiles talk.

To know which props a widget has, and which are collections and which are values, read its manifest
and its `createWidget` declaration — `node .widgetarium/bin/widgets.mjs show <id>` prints both.

## A tile that holds other widgets

Some widgets take children.

```yaml
- id: w3
  widget: "@core/view-group"
  mounts:
    views:
      - { name: Board, widget: "@task/kanban" }
      - { name: Table, widget: "@task/table" }
  mounted:
    Board:
      widget: "@task/kanban"
      props:
        cards: { from: vault, path: Tasks }
```

`mounts` is the list of children and their names; `mounted` holds each child's own props, keyed by
the name. `slots` is the same shape for children a manifest declares by name rather than letting the
person add. A slot whose manifest declares `gives` is fed by its parent and owns no props of its
own; without `gives` the child owns them.

## Sanity before you save

- The YAML parses.
- Every `id` in `layout` exists in `tiles`.
- Every `widget` id is installed — `node .widgetarium/bin/widgets.mjs list --source installed` says
  what is.
- `v:` is unchanged.
