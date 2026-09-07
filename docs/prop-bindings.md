# Where a prop reads from

`BUILT` · 2026-09-02 · `src/gateway/props.js`, `src/gateway/refs.ts`, `src/surface.js`,
`src/settings-window.js`, proved by `npm run test:gateway`, `npm run test:engine`,
`npm run test:view`, `npm run test:identity`

## TL;DR

Every widget prop is a gateway, and the person picks **where it reads from**: a folder in the
vault, a list typed into the tile, or **another widget's box on the same board**. There is no
context bus and no string channels: one widget points at another by `ref`, which is
`<tileId>/<propName>`. A selection — which tab, which view, which card is open — is a box the
engine owns, keyed to the prop that declares it.

## The config on the tile

```
tile.props.tasks = {
  from:  "typed" | "vault" | "ref",   which one is read
  path:  "Orbitask/Tasks",            kept even while typed is read
  value: [ {...}, {...} ],            kept even while vault is read
  ref:   "tabs/selection",            another widget's box
  where: [ ... ],                     the conditions this prop is narrowed by
  sort:  [ { prop, dir } ],
}
```

`bindingOf(spec, config)` in `src/gateway/props.js` answers in this order:

| what it finds | binding |
|---|---|
| `from: "ref"`, or a `ref` | ref |
| the manifest declares `of` | box |
| `from: "typed"` | hardcode |
| `from: "vault"` | vault |
| a `value` and no `from` | hardcode |
| a `path` and no `from` | vault |
| the manifest's default says `from: "memory"` | memory |
| neither | whatever the manifest's `default` carries |

`resolveGateway` (`src/surface.js`) turns that into a gateway:

```
collection + vault     → folderGateway(path)        notes in a folder
collection + hardcode  → hardcodeCollection(value)  rows in the tile
collection + ref       → refCollection(refs, ref)   another widget's list
value      + vault     → fileGateway(path)          one note
value      + hardcode  → hardcodeValue(value)       one value in the tile
value      + ref       → refValue(refs, ref)        another widget's box
value      + memory    → refs.memoryValue(ref)      a box of this viewer's own
value      + box       → selectionGateway(...)      which row of `of` is picked
```

Every collection gateway is then wrapped by `narrowedByRefs(base, where, refs)` when the prop
carries `where` rows.

## The registry

One `createGatewayRefs()` per board, held for the life of the surface. `WidgetHost` registers
every prop and every mount under `refOf(tile.id, name)` while it renders, and drops them when
it unmounts — comparing identity, so a tile re-rendered in a settings window does not delete
the registration the board's copy just made.

| what it holds | why |
|---|---|
| `ref → gateway` | what `{ ref }` in a where row resolves against |
| `ref → { tile, prop, label, title, kind, shape }` | the dropdown in the settings window |
| `ref → dependsOn[]` | a cycle is refused before it is chased, at read time |

Beside it, `createViewCells()` holds the boxes themselves — a memory cell per ref, local to this
viewer, reaching no file. The registry answers "which gateway is behind this ref"; the cells answer
"what has this viewer picked". Two facts, two owners.

## Wiring, at the press

A manifest says what a prop **wants** — a widget id and a prop name, the way a slot already names
its default widget:

```json
"selection": { "kind": "value", "of": "boards", "wants": "@core/editable-tabs/selection" }
"tasks": { "default": { "path": "Orbitask/Tasks", "where": [
  { "prop": "board", "op": "is", "value": { "wants": "@core/editable-tabs/selection" } },
  { "spread": { "wants": "@core/filter-panel/chosen" } }
] } }
```

`wiredTiles` (`src/engine/wiring.js`) resolves every `wants` against the tiles the board already
holds — widgets mounted inside a holder included, found under `holder/mount` — and writes the
concrete refs onto the tile. It runs when a tile **lands**: added from the catalogue, or folded
into a group. Never on a render: the link is a write, so it is readable in the note and editable
afterwards.

| what it finds | what it does |
|---|---|
| the prop is already bound by hand | leaves it |
| the widget it wants is not on the board | leaves it unbound, and the unresolved condition narrows nothing rather than matching nothing |
| the widget it wants is there | writes `{ from: "ref", ref }`, or the resolved where row, marked `fixed` |

A wired where row is `fixed`: the settings window draws it as the widget's own, beside the
conditions the person added. Re-wiring replaces the fixed rows and leaves the rest alone.

`refs.watch(refs, listener)` follows a ref through re-registration: it re-hangs its
subscriptions whenever the registry changes, so a widget reading through a ref is woken by a
write on the other side of it.

## A where row

```json
"where": [
  { "prop": "board", "op": "is", "value": { "ref": "tabs/selection" } },
  { "spread": { "ref": "filters/chosen" } }
]
```

`resolveWhere(rows, refs)` reads each ref and normalises it:

```
"Widgetarium"          → { prop, op: "is",  value: "Widgetarium" }
["a", "b"]             → { prop, op: "in",  value: ["a", "b"] }
nothing picked         → no clause at all, so the board is not narrowed to nothing
{ status: [...] }      → one clause per key, which is what a spread is
```

Every resolved row carries `by`, the ref it came from, so the settings window can say where a
condition came from. `normalizeWhere` (`src/gateway/narrow.ts`) is the same normaliser a widget
gets through `narrowed(base, { board: chosen })`.

## A selection is a ref into a list

A prop that declares `of` names the collection prop it selects from. The box holds **the row's
ref** and nothing else:

```json
"selection": {
  "kind": "value",
  "of": "tabs",
  "fieldFrom": "value",
  "fallback": "first",
  "verbs": { "get": "required", "update": "required" }
}
```

- `of` — the collection prop this is a selection over.
- `field` / `fieldFrom` — which field of the picked row `get()` answers with. `fieldFrom` names
  another value prop that carries the field name, which is how `Value field` still works.
- `fallback: "first"` — with nothing picked, the first row answers.
- no field at all — `get()` answers with the row's ref, which is what an opened card is.

`get()` falls back the way a record's identity falls back: the named field, then the record's
id, then its name. Where an id and a name both stand it answers with **both**, and the
normaliser turns that into `op: "in"` — which is how a task filed under a board's old name
stays on the board.

A ref that names a row the list no longer holds is no selection: the box falls back rather than
naming something that is not there.

## What the switchers read now

- `@core/editable-tabs` declares `tabs`, `label`, `value` and `selection`.
- `@task/view-tabs` declares `options` and `selection`; both are normally bound by ref to a view
  group's `holds` and `selection`, so the group's mount list is the only list of views there is.
- `@core/view-group` exposes `holds` as a read-only collection and declares `selection` over it.
- `@core/filter-panel` declares `chosen`, a memory box; a widget narrows itself by pointing a
  `spread` row at it.
- `@task/kanban-board` declares `selection` (which board) and `opened` (which card). It draws the
  opened card itself, so nothing on the board binds to `opened` — the box is read where it is owned.

## In the settings window

`Source · <label>` offers Folder / Typed here / **From a widget**, and the third lists what
every other tile on the board offers, grouped by widget title. A selection prop offers
`This widget's` and `From a widget` only — a box is never a folder.

`Where · <label>` is an editable list. A condition the manifest declares is drawn `Fixed`; the
person's own rows can be edited, removed and added. `Add condition` opens a three-step wizard,
never a text field:

| step | what it offers | said above it |
|---|---|---|
| Property | the properties the notes in the bound folder actually carry, plus a field for one they do not | Which property of the data are we looking at? |
| Condition | only the conditions that property's type takes | How should that property be compared? |
| Value | the values the notes hold under that property, a field, then the boxes other widgets offer | What is it compared against? |

Picking a condition that needs no value — `is empty`, `is checked` — writes the row and closes:
the third step never opens. The steps are read back as a sentence (`status is not Done`), and
pressing the row reopens any one of them.

`fieldsOf` (`src/gateway/fields.ts`) derives the property list off the records, because nothing
declares a schema; `conditionsFor` (`src/gateway/operators.ts`) is the whole diagram of which
condition each type takes:

| type | conditions |
|---|---|
| text | is · is not · contains · is empty · is not empty |
| number | is · is not · is greater than · is less than · is empty · is not empty |
| date | is · is before · is after · is empty · is not empty |
| list | has any of · has none of · is empty · is not empty |
| boolean | is checked · is not checked |

They map onto the operators the matcher already had — `is`, `ne`, `contains`, `gt`, `lt`, `in`,
`nin`, `exists` — so the row the wizard writes is the row the engine reads.

`Everything a filter has picked` is the second way to add a row, and it is offered only when a
box of shape `conditions` exists on the board.

## A box has a shape

A `ValueGateway` says nothing about what it holds, and the two things it can hold do not fit the
same slot. The manifest declares which:

| `shape` | holds | may be pointed at by |
|---|---|---|
| `value` (the default) | one value, or the id and name of one record | the Value step of a condition |
| `conditions` | a map of property → value, already a filter | a `spread` row |

`refs.put` carries it into the registry, so the Value step lists only `value` boxes and the
spread row lists only `conditions` ones. Pointing one at the other is not refused at read time —
it is never offered.

## Not there yet

- **No runtime type checking.** Types are stripped before the plugin runs
  (`docs/typed-widgets.md`), and no schema guards `create`/`update` on a gateway.
- **No warning when a box somebody reads is unbound.** Deleting the tile that owns a box leaves
  the readers narrowing by nothing, which shows everything rather than saying so.
- **No "a property of one note" binding.** A value prop bound to the vault reads a whole file.
- **Nothing migrates a board written before this.** `provides` / `consumes` / `@`-substitution /
  `sources` are gone with no `was`, so a board authored against the bus opens unwired. Adding any
  widget to it re-wires the whole board; until then the links are made in the settings window.
- **`wants` names one widget, not a kind.** Two tab strips on one board, and a widget added after
  them wires to whichever tile the note lists first.
