# The board

## The note and the block

A board lives in a fenced block inside an ordinary markdown note. `widgetarium: { kind: screen }` in
the frontmatter makes the note a screen, so the board takes the whole page; without it the board is
a block inside somebody's prose and stays the size it is given. A note may hold several boards, each
its own block. **Saving the note is what draws it.**

````markdown
---
widgetarium: { kind: screen }
---

```widgetarium
v: 2
tiles:
  - id: w0
    widget: "@default/metric-total"
    props:
      title: { from: typed, value: Revenue }
      records: { from: vault, path: Metrics }
  - id: w1
    widget: "@default/editable-tabs"
layout:
  dir: row
  of:
    - { dir: column, of: [], collapse: { into: drawer, toggle: always } }
    - dir: column
      keep: true
      surface: none
      of:
        - { id: w1 }
        - { id: w0, height: 320 }
    - { dir: column, of: [], collapse: { into: drawer, toggle: always } }
```
````

- `v: 2` is the block format. **Copy what is in the file; never raise it.** A newer format is
  refused rather than migrated, and the person sees a message instead of their screen.
- `tiles` is the flat list of what is on this board. `id` is any unique string; `w0`, `w1` is the
  convention. `widget` is `@pack/name`, also its folder under `.widgetarium/widgets/`.
- `layout` says where each tile stands. **A tile in `tiles` but not in `layout` is not drawn.**

## The tree

`layout` is a **node**, and a node is one of two things.

A **leaf** names a tile:

```yaml
{ id: w0, ratio: 2, height: 320, surface: item }
```

`ratio` is its share along the parent's direction, default `1`. **Only a leaf has a height** — a box
is as tall as the widgets in it, so to make a row 86px tall give each of its widgets `height: 86`.
`heights: { 1: 180 }` applies while the row stands one across, falling back to the nearest wider
count.

A **box** holds other nodes:

```yaml
dir: column # row, column or swap
of: [...] # the children, in order
ratio: 1 # its share of its parent
width: 280 # pixels, optional
keep: true # never folded away — the main region
collapse: # what happens when it does not fit
  into: drawer # stack, drawer, sheet, menu or hide
  toggle: always # always, or adaptive (only while collapsed)
trigger: t1/open # the ref of an @default/toggle that opens it
folded: true # it starts folded
scroll: true # it scrolls on its own
name: Filters # a label, presentation only
surface: group # none, apart, group, item or object — see surfaces.md
side: start # which side an apart line stands on: start or end
role: indicators # navigation, indicator(s), collection, detail, composer, control, media, text
purpose: How the selected habit is going # the one question this box answers
```

`collapse: drawer` is short for `{ into: drawer, toggle: adaptive }`.

**`surface` sits on a leaf too, and you write it as you place the node.** Nothing lays it for you.
See `surfaces.md`.

**There is no field for spacing.** The gap is the step of the box's level under its region — 24px,
16px, then 8px. So a box is never made to move things closer: make one only when it wears a surface,
opens with a heading, or turns direction.

Boxes nest to any depth. `[[A], [B, [C over D]]]` is a row of two columns, the second holding B above
a row of C and D.

The root of a new board is a row of three boxes — a sidebar, a `keep` middle, a sidebar. The only
thing that makes a box a sidebar is `collapse: { into: drawer, toggle: always }`. **A box with an
empty `of` is still a real region** — a person can drop a tile into it. Do not delete the empty
sidebars from a new board.

An older note may hold `layout: { left, main, right }` or a `layouts:` map of `{x, y, w, h}`. Both
are read and converted on the first write. Do not author either.

## When the screen is too narrow

A box never squeezes below what its widgets need. When a row cannot give every child its floor, the
children carrying a `collapse` leave the row. **Nothing is chosen by breakpoint: the widths decide.**

| `into` | what the box becomes |
| --- | --- |
| `stack` | the default: children stand one under another |
| `drawer` | a panel sliding over the window from its side — a sidebar |
| `sheet` | a panel rising from the bottom — a supporting pane on a phone |
| `menu` | a panel growing from the press that opened it — a header's actions |
| `hide` | nothing on screen; its widgets stay mounted |

A collapsed box needs a way back. By default a button appears in Obsidian's own view header, beside
the reading-mode toggle. `toggle: always` keeps it there on every screen — while the box stands in
the row it folds and unfolds it, and `folded` is written to the note. `toggle: adaptive`, the
default, shows the button only when the width takes the box out of the row.

For a button **inside** the screen, place an `@default/toggle` tile and name its `open` in the box:
`trigger: t1/open`. The header button then does not appear.

Whether a collapsed box is open is a fact about the screen: nothing about it reaches the note. The
board has no bar of its own — edit mode is the pencil in Obsidian's view header.

## Placing a tile

Two edits in one save: append a record to `tiles`, and append a leaf naming its `id` to the box it
stands in — almost always the `keep` box. Give the leaf its `surface` in the same edit.

Save. The person sees it appear. Then bind it.

## Binding a prop

Every value a widget reads is a **gateway**. Three shapes:

```yaml
props:
  records: { from: vault, path: Metrics, allow: [list, create, update] } # a folder, or one note
  status: { from: vault, path: Habits.md, field: status } # one part of one note
  title: { from: typed, value: Revenue } # a value living in the tile
  columns: { from: typed, rows: [{ name: To Do }] } # a list living in the tile
  period: { from: ref, ref: "w1/tabs" } # another tile's prop
```

- **`from: vault`** — `path` is a folder (a collection: every note is a row) or a single `.md` file
  (a value). A value prop over one note may name `field`: `content`, `name`, or any property.
  **A board whose tiles are all `typed` is a mock-up, not a screen.** `allow` lists what the tile may
  do; write the verbs the widget uses when the person asked for a working screen. Without `allow` a
  vault binding only reads.
- **`from: typed`** — the data sits in the block: `rows` for a collection, `value` for a primitive.
- **`from: ref`** — `<tileId>/<propName>`, pointing at the gateway another tile exposes. This is how
  a tab strip drives the widgets below it. **There is no shared bus; a ref is the only way two tiles
  talk.**

To know a widget's props run `widgets.mjs show <id>`. A tile's `widget` may carry the commit it was
made with, `"@scope/name@<commit>"` — keep it as written.

## Views: one place, several screens

A **swap box** draws one child at a time and keeps the others mounted, so their refs stay alive.

```yaml
- dir: swap
  id: views # required to bind anything to it
  of:
    - { id: w3, name: Board }
    - { id: w4, name: Archive }
    - { dir: column, of: [], name: Later } # a view not filled yet
```

- Every child carries a `name`: the tab label and the view's identity. `hidden: true` archives a
  view without deleting its tiles. A child is any node — one tile, or a column of several.
- The box draws its own tab strip; `strip: false` hides it when a switcher elsewhere drives it.
- It publishes `<id>/holds` and `<id>/selection`. Bind a switcher to both.
- Which view is shown never reaches the note. A swap adds no spacing level.
- `@default/view-group` is gone as a thing to author.

## A widget that holds other widgets

```yaml
- id: w5
  widget: "@default/kanban-board"
  slots:
    card: { widget: "@default/task-card", surface: item }
```

`slots` holds each child a manifest declares by name. A slot whose manifest declares `gives` is fed
by its parent and owns no props; without `gives` the child owns them. A slot wears a surface too, and
it is what every item the slot draws is wrapped in. Views are not this — use a swap box.

## Sanity before you save

- The YAML parses.
- Every leaf `id` in `layout` exists in `tiles`; a swap box's `id` does not, and must not.
- Every child of a swap box has a `name`, unique within that box.
- Every `widget` id is installed — `widgets.mjs find --source installed` says what is.
- Every node you placed carries the `surface` you meant it to have.
- `v:` is unchanged.
