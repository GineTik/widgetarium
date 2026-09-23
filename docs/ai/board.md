# The board

## The block

`widgetarium: { kind: screen }` in the frontmatter makes the note a screen and the board takes the
whole page. Without it the board is a block inside prose and keeps the size it is given. A note may
hold several blocks. **Saving the note draws it.**

**A screen note holds the board and nothing above it.** Not a design write-up, not an introduction,
not a list of what the regions are for. The board claims the window's height, but it still begins
where the note begins — put forty lines of prose in front of it and the person scrolls past your
notes every time they open the thing they came to use. One `#` heading is allowed and even that is
optional. Everything you want to say about the screen goes in a note of its own, linked from there.
A board inside prose is a different thing and that is what a note **without** `kind: screen` is for.

- `v: 2` is the block format. Copy what is there; never raise it. A newer format is refused, not
  migrated, and the person sees a message instead of their screen.
- `tiles` is the flat list. `id` is any unique string, `w0` by convention. `widget` is `@pack/name`,
  also its folder under `.widgetarium/widgets/`, optionally with the commit it was made with:
  `"@you/clock@<commit>"`. Keep it as written.
- `layout` says where each tile stands. **A tile in `tiles` but not in `layout` is not drawn.**
- `base:` names the base the screen started from, so `lint` can hold what you built against what you
  declared. Reshape the tree freely; keep the key honest or drop it.

A whole board is in [examples.md](examples.md).

## The tree

`layout` is a node. A node is a leaf or a box.

A **leaf** names a tile:

```yaml
{ id: w0, ratio: 2, surface: group }
```

`ratio` is its share along the parent's direction, default `1`. **Nothing on the board has a
height.** A widget leans toward the `preferredWidth` and `preferredHeight` its manifest declares and
grows past them when it has more to draw, and a box is as tall as its widgets. The only size a person sets is a region's `width`,
by dragging the edge between regions. `height` and `heights` are refused by `lint`.

A **box** holds nodes:

```yaml
dir: column # row, column or swap
of: [...] # the children, in order
ratio: 1 # its share of its parent
width: 280 # pixels, optional
keep: true # never folded away — the main region
collapse: { into: drawer, toggle: always } # what happens when it does not fit
trigger: t1/open # the ref of a @default/toggle that opens it
folded: true # it starts folded
scroll: true # it scrolls on its own
name: Filters # a label, presentation only
surface: group # none, apart or group — see surfaces.md
side: start # which edge an apart line stands on: start or end
role: indicators # navigation, indicator(s), collection, detail, composer, control, media, text
purpose: How the selected habit is going # the one question this box answers
```

`collapse: drawer` is short for `{ into: drawer, toggle: adaptive }`.

Boxes nest to any depth. `[[A], [B, [C over D]]]` is a row of two columns, the second holding B above
a row of C and D.

The root of a new board is a row of three boxes — a side, a `keep` middle, a side. What makes a box a
side is `collapse`, never its position. **A box with an empty `of` is still a real region**: a person
can drop a tile into it. Do not delete the empty sides.

**There is no field for spacing, and none for corners.** Both follow the tree. A box exists where a
surface, a heading or a turn of direction makes a group visible.

**A heading is a tile, never a field.** `name` labels a swap box's tab and a collapsed box's drawer
and is drawn nowhere else, so a section is titled by standing a `role: text` tile first in its
column — `@default/text-line` with `heading: 1` for the page, `2` for a section, `0` and
`tone: caption` for the line under it. That tile is what `lint` reads when it asks whether a column
has a heading, and it is what a base arrives carrying.

An older note may hold `layout: { left, main, right }` or a `layouts:` map of `{x, y, w, h}`. Both
are read and converted on the first write. Never author either.

## When the screen is too narrow

A box never squeezes below what its widgets need. When a row cannot give every child its floor, the
children carrying a `collapse` leave the row. **Nothing is chosen by breakpoint: the widths decide.**

| `into`   | what the box becomes                                      |
| -------- | --------------------------------------------------------- |
| `stack`  | the default: children stand one under another             |
| `drawer` | a panel sliding over the window from its side — a sidebar |
| `sheet`  | a panel rising from the bottom                            |
| `menu`   | a panel growing from the press that opened it             |
| `hide`   | nothing on screen; its widgets stay mounted               |

A collapsed box needs a way back. By default a button appears in Obsidian's own view header.
`toggle: always` keeps it there on every screen and writes `folded` to the note; `toggle: adaptive`
shows it only while the width takes the box out of the row. For a button inside the screen, place a
`@default/toggle` tile and name its `open`: `trigger: t1/open`. The header button then does not
appear.

Whether a collapsed box is open is a fact about the screen: none of it reaches the note. The board
has no bar of its own — edit mode is the pencil in Obsidian's view header.

## Placing a tile

Two edits in one save: append a record to `tiles`, append a leaf naming its `id` to the box it stands
in. Give the leaf its `surface` in the same edit. Save, let the person see it, then bind it.

## Sections

A widget whose manifest names `role: layout` stands in a region and titles what is under it. It is
the only kind allowed to draw its own `h2`; every other widget is titled from outside.
`@default/section` is the one that ships:

```yaml
- id: projects
  widget: "@default/section"
  props:
    heading: { from: typed, value: Projects }
    badge: { from: typed, value: 5 open }
    filling: { from: typed, value: per-row }
    items: { from: vault, path: Projects, allow: [list] }
    arrangement: { from: typed, value: grid }
    minWidthPx: { from: typed, value: 280 }
  slots:
    item: { widget: "@flow/project-card" }
```

`filling` is one switch with two answers, and the settings window asks only for the half in use:

- **`placed`** — the widgets a person put in `mounts.widgets`, each keeping its own props and its own
  settings. Use it when the cells are different kinds of thing.
- **`per-row`** — `slots.item` drawn again for every row of `items`, the whole row handed down. Use
  it when every cell is the same kind of record. There is nothing to edit per row: the binding is the
  edit.

`arrangement` decides both how the body stands and what it stands on:

| `arrangement` | Stands                   | Plates                         |
| ------------- | ------------------------ | ------------------------------ |
| `column`      | down the column          | none                           |
| `row`         | across                   | one on each widget             |
| `grid`        | wraps under `minWidthPx` | one on each widget             |
| `rows`        | down the column          | one around all, a line between |

Controls belong in `mounts.controls` and govern this section only — a control over the whole screen
stands in the screen's own heading instead.

**The section wears nothing; its arrangement plates what stands in it.** The heading stays outside
every plate. A widget that paints its own cards stands in a `column`. One placed widget may say
otherwise for itself: `mounted.<name>.surface` wins over the arrangement, set in that widget's own
Design tab.

`badgeTone` is what the badge means, not how it is painted: `neutral` for a count, `success`,
`warning` or `error` for a state, `accent`, `info`, `note`, `standout` or `highlight` where the
design needs one. The colour comes from the kit.

A section is not compulsory. A badge, a note, a toggle standing alone in a region needs no heading,
and nothing refuses one placed bare.

## Binding a prop

Every value a widget reads is a gateway. Three shapes:

```yaml
props:
  records: { from: vault, path: Metrics, allow: [list, create, update] } # a folder, or one note
  status: { from: vault, path: Habits.md, field: status } # one part of one note
  title: { from: typed, value: Revenue } # a value living in the tile
  columns: { from: typed, rows: [{ name: To Do }] } # a list living in the tile
  period: { from: ref, ref: "w1/tabs" } # another tile's prop
```

- **`from: vault`** — `path` is a folder (every note is a row) or a single `.md` file. A value prop
  over one note may name `field`: `content`, `name`, or any property. `allow` lists what the tile may
  do; without it a vault binding only reads. **A board whose tiles are all `typed` is a mock-up, not
  a screen.**
- **`from: typed`** — `rows` for a collection, `value` for a primitive.
- **`from: ref`** — `<tileId>/<propName>`. This is how a tab strip drives the widgets below it.
  **There is no shared bus; a ref is the only way two tiles talk.**

`widgets.mjs show <id>` prints a widget's props.

## Views: one place, several screens

A **swap box** draws one child at a time and keeps the others mounted, so their refs stay alive.

```yaml
- dir: swap
  id: views # required to bind anything to it
  of:
    - { id: w3, name: Board }
    - { id: w4, name: Archive }
    - { dir: column, of: [], name: Later }
```

Every child carries a `name`: the tab label and the view's identity. `hidden: true` archives one. The
box draws its own tab strip; `strip: false` hides it when a switcher elsewhere drives it. It
publishes `<id>/holds` and `<id>/selection`. Which view is shown never reaches the note, and a swap
adds no spacing level.

## A widget that holds other widgets

```yaml
- id: w5
  widget: "@default/kanban-board"
  slots:
    card: { widget: "@default/task-card", surface: group }
```

`slots` holds each child a manifest declares by name. A slot whose manifest declares `gives` is fed
by its parent and owns no props; without `gives` the child owns them. A slot wears a surface too, and
it is what every item the slot draws is wrapped in. Views are not this — use a swap box.

## Before you save

- The YAML parses.
- Every leaf `id` exists in `tiles`; a swap box's `id` does not, and must not.
- Every child of a swap box has a `name`, unique in that box.
- Every `widget` id is installed.
- Every node you placed carries the surface you meant.
- `v:` is unchanged.
- `lint` passes.
