# The board

## The block

`widgetarium: { kind: screen }` in the frontmatter makes the note a screen: the board takes the whole
page. Without it the board is a block inside prose. **Saving the note draws it.** A screen note holds
the board and nothing above it but an optional `#` heading; anything you want to say about the screen
goes in a note of its own.

- `v: 2` is the block format. Copy it; never raise it.
- `tiles` is the flat list: `id` (unique, `w0` by convention) and `widget` (`@pack/name`, optionally
  `@pack/name@<commit>`; keep it as written).
- `layout` says where each tile stands. **A tile in `tiles` but not in `layout` is not drawn.**
- `base:` names the base the screen started from, so `lint` can hold the build against it.

## The tree

`layout` is a node: a **leaf** `{ id: w0, surface: group }` naming a tile, or a **box**:

```yaml
dir: column # row, column or swap
of: [...] # the children, in order
width: 280 # pixels, optional; the only size a person sets, by dragging a region's edge
keep: true # never folded away: the main region
collapse: { into: drawer, toggle: always } # what happens when it does not fit
trigger: t1/open # the ref of a @default/toggle that opens it
scroll: true # it scrolls on its own
justify: between # start, center, end, between: along it
align: center # start, center, end, stretch: across it
wrap: true # a row whose children wrap
name: Filters # a swap tab's or a drawer's label, drawn nowhere else
surface: group # none, apart or group: surfaces.md
side: start # the edge an apart line stands on
role: indicators # navigation, indicator(s), collection, detail, composer, control, media, text
purpose: How the selected habit is going # the one question this box answers
```

**Nothing on the board has a height.** A widget leans toward the size its layout declares and grows
past it; a box is as tall as what it holds. `height` is refused by `lint`. In a row naming `justify` or
`wrap`, a tile takes its preferred width: a title beside its add button is
`{ dir: row, justify: between, align: center, of: [{ id: title }, { id: add }] }`.

The root of a new board is a row of three boxes: a side, a `keep` middle, a side. **A box with an empty
`of` is still a region** a tile can be dropped into; never delete the empty sides. There is no field
for spacing or corners: both follow the tree. **A heading is a tile**: a `role: text` tile first in
its column, `@default/text-line` with `heading: 1` for the page, `2` for a section.

## When the screen is too narrow

A box never squeezes below what its widgets need; the children carrying a `collapse` leave the row.
Nothing is chosen by breakpoint.

| `into`   | what the box becomes                          |
| -------- | --------------------------------------------- |
| `stack`  | the default: children one under another       |
| `drawer` | a panel sliding over the window from its side |
| `sheet`  | a panel rising from the bottom                |
| `menu`   | a panel growing from the press that opened it |
| `hide`   | nothing on screen; its widgets stay mounted   |

A collapsed box opens from a button in Obsidian's view header: `toggle: always` keeps it on every
width, `toggle: adaptive` only while the box is out of the row. A `@default/toggle` tile named in
`trigger` replaces the header button.

## Binding data

Every query and command a widget declares is bound on the tile to a handler: `implementation` names
it, `fields` is what it is told.

```yaml
props:
  getRecords: { implementation: "@obsidian/folder", fields: { path: Metrics } }
  getStatus: { implementation: "@obsidian/file", fields: { path: Habits.md, field: status } }
  getTitle: { implementation: "@core/typed-value", fields: { value: Revenue } }
  getColumns: { implementation: "@core/typed-rows", fields: { rows: [{ name: To Do }] } }
  getPeriod: { implementation: "@core/from-tile-value", fields: { ref: "w1/getSelection" } }
  getView: { implementation: "@core/screen-state", fields: { key: home.view } }
  getDone: { implementation: "@stats/count", fields: { path: Log } }
```

- **`@obsidian/folder`**: every note of `path` is a row; **`@obsidian/file`**: one note, `field`
  naming `content`, `name` or a property. **A board whose tiles are all typed is a mock-up, not a
  screen.**
- **`@core/typed-value`, `@core/typed-rows`**: a value or rows kept in the tile.
- **`@core/from-tile-value`, `@core/from-tile-rows`**: `ref` is `<tileId>/<propName>`, the only way two
  tiles talk. **`@core/screen-state`**: a value every tile naming the key shares.
- **`@stats/<algorithm>`**: one number over the notes of `path`.
- A feature handler of the app is bound by the id its pack registers.
- A prop with no binding draws its declared default.

`widgets.mjs show <id>` prints a widget's queries and commands.

## Switching a command on

**A command that writes the vault stays shut until its binding carries `allow: [run]`.** That line is
the person's consent; without it the widget hides its Add, Save or Delete. Switch on exactly the
commands the spec's actions name; `report` prints the line for every one still shut.

```yaml
props:
  getWords: { implementation: "@obsidian/folder", fields: { path: Words } }
  createWord: { implementation: "@obsidian/folder-create", fields: { path: Words }, allow: [run] }
  updateWord: { implementation: "@obsidian/folder-update", fields: { path: Words }, allow: [run] }
```

A command over rows kept in the tile (`@core/rows-create`, `@core/value-set`) runs without it.

## Views, slots and sections

A **swap box** (`dir: swap` with an `id`) draws one named child at a time and keeps the others
mounted. Every child carries a unique `name`, its tab label; `hidden: true` archives one, `strip: false`
hides the box's own tab strip. It publishes `<id>/holds` and `<id>/selection`.

A widget holding other widgets names them under `slots` (`card: { widget: "@default/task-card",
surface: group }`) or `mounts`; a slot whose manifest declares `gives` is fed by its parent. A titled
part of a region is `@default/section`: a heading, a badge, `controls`, and a body that is either the
widgets placed in it or one widget drawn per row; `examples.md` has both.

## Before you save

- The YAML parses; `v:` is unchanged.
- Every leaf `id` exists in `tiles`; a swap box's `id` does not.
- Every `widget` id is installed or offered by `find`.
- Every node carries the surface you meant.
- `lint` passes.
