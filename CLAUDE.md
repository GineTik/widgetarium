# Widgetarium

An Obsidian plugin: widget tiles in a nested layout inside a note, plus rules that substitute a
widget for a line of text. `src/` is React with `h()` hyperscript — **no JSX there**; the gateway layer under
`src/gateway/` is TypeScript (`tsc --noEmit` gates it), the rest of `src/` is untyped JS that dies
in place rather than being typed. Widgets under `widgets/` are `.tsx` compiled at runtime by
sucrase (types stripped, never checked — the contract holds through `can()` and the engine, not tsc).

**The handbook written for the in-app agent is your handbook too.** `docs/ai/` (start at
`docs/ai/README.md`) and `docs/patterns/` are what the plugin lays into a vault for the assistant,
and they are the shortest true description of how a board, a widget, its manifest, its roles and its
surfaces work. Read the page that covers a change before touching the code, and keep it true in the
same change: a law that changed in code and not there is a law the next agent breaks.

**A widget describes itself with one value in its own file.** `export const manifest =
defineManifest({ ... })` beside the component, and `export default createWidget(manifest, Component)`,
whose component is anonymous and carries no props annotation — it is typed from the manifest.

```tsx
type Entry = { title: string; done?: boolean };

export const manifest = defineManifest({
	title: "Checklist",
	description: "The entries still to do, ticked off where they stand.",
	props: {
		heading: defineProp<string>()({ default: "To do" }),
		open: defineProp<boolean>()({ default: false, keep: "screen", writes: ["update"] }),
		entries: defineProp<Entry[]>()({ default: [], writes: ["create", "update"], describes: { done: { aka: ["complete"] } } }),
	},
});

export default createWidget(manifest, ({ heading, entries, open }) => { ... });
```

Every prop is `defineProp<Held>()({ ... })` from `src/gateway/manifest.ts`, and **the type it holds
decides what it is**: an array is a collection, anything else a value. What the prop carries is data,
never a second builder — `control` only when the drawing is not obvious from the type (`text`,
`emoji`, `icon`), `keep: "screen"` for a value that never reaches the note, `of`/`picks` for a prop
that names a row of another, `default` always. `label` is read off the key (`archivedAt` → "Archived
at") and written only when the key lies. `aka` is every other name the prop answered to. **The two
parentheses are not decoration**: TypeScript stops inferring the rest of a call once a type argument
is given by hand, so the type goes in the first call and the literal `writes` in the second. Nothing
can be hidden behind a wrapper — a wrapper hides execution, not inference.

**`writes` is the widget asking, `allow` is the person answering.** A prop declares only what it
changes; `list` and `get` are never declared and always there. A verb missing from `writes` does not
exist on the gateway **at compile time** (`entries.remove` is `TS2339`), and an own verb is declared
typed: `writes: { archive: verb<{ ref: RecordRef }>() }`.

**`describes` is what the type could not say.** One object keyed by the row's fields, holding the
label a person reads, the `aka` a vault note may use for it and the `type` the engine matches fields
by. It replaced both `item.fields` and `needs`, which described the same row twice.
Four readers, each drawing a **different** conclusion from it, and no two of them ever compute the
same answer: `describedFields` and `needsOf` in `src/gateway/props.js` — the field list the settings
window draws, and the fields that take part in matching a note's properties — `inputsOfProp` in
`src/reading.js`, which counts them to classify the prop's reading, and `typesIn` in
`src/ai/find-command.mjs`, which collects their types to rank a search. The line between the first
two is `aka`: **a field takes part in matching a note's properties exactly when it
names other names.** Without `aka` the widget reads the field under its own name, and `describes`
only tells the settings window how to draw it.

**A row is the record, and `ref` is its address.** `Row<T> = T & { ref }` — there is no `{ ref, value }`
wrapper, so a widget writes `entry.title`, keys by `entry.ref`, and `useData` answers with `data`
alone: an array for a list, the value for a value, `total` beside it. `ref` in a row type must be
typed `RecordRef` or left out, and `defineManifest` refuses a described or defaulted `ref` outright.
`rowOf` and `valueIn` in `src/gateway/create.ts` are the only places an address is put on or taken
off. A list of primitives is the one exception and keeps `{ value, ref }`, because a string has
nowhere else to hold itself.

The engine resolves each prop to a gateway from the binding the person chose — a vault folder or
file, a value kept in the tile, or another tile's ref. Widgets read through `useData(gateway.list)`
and write through verbs; every verb is asked through `can()`. The manifest carries no id, no version
and no api: the id is the folder, the version is the commit, the api is stamped by the build.
**The agent sees the whole catalogue, not the vault.** `widgets.mjs find` merges what is installed
with what every configured source offers, and `src/engine/registry-file.js` is the one reader of a
registry — a source naming a `path` on this machine is read off disk, one naming a `repository` is
fetched, and both come back through `readRegistry`, which is what turns a registry's `scope` and a
row's `name` into an id. An offered row carries its folder, so it is ranked by the role and the
fields its own manifest declares rather than sitting at zero, and `widgets.mjs install <id>` writes
it and its scope's shared files into the vault and records the install in the lock, leaving the build
to the engine. Everything the plugin still owns is the remote fetch. A vault whose catalogue
answers with only what it already holds is what makes an agent write a widget that exists.

`manifestOf` in `src/engine/catalogue-index.js` is the one place a declaration becomes the manifest
the engine reads; an old `createWidget(component, { props })` still passes through `legacyProp` there
until the last shipped widget moves.

**A widget folder is typed wherever it stands.** The repo has `widgets/tsconfig.json`, so an editor
opening a widget resolves `widgetarium` instead of reporting `TS2307` and handing every prop `any` —
the root `tsconfig.json` covers only `src/`. The vault gets the same: `layAgentFiles` lays
`.widgetarium/widgets/tsconfig.json` and `types/` beside the widgets, built by `tools/widget-types.mjs`
from the gateway's emitted declarations, so a widget written in a vault is typed by the same manifest
the engine reads. `npm run test:vault-types` lays them into a temp folder and compiles a widget
against them.

**`manifest.generated.json` is the catalogue's card, and it is written, never authored.** `npm run
manifest` runs every widget's code and writes `cardOf(manifest)` beside it, and refuses to write a
card for a widget whose manifest the engine would refuse. A
catalogue that has not run a widget's code reads the card; a vault that has reads the code. An
install runs the code and refuses a card that says something the code does not.
`tools/widget-props.json` pins every shipped widget's resolved props — regenerate it with `node
tools/widget-props.mjs` when a prop change is intended.

**A list never hands over everything.** `pageOf` caps an unasked read at `PAGE_UNASKED` — a hundred
rows — so a widget that draws what it read draws a hundred at most and a vault of a thousand notes
cannot take the frame with it. A widget that needs more says how many and thereby says why: an
aggregate names its own ceiling in its source, where a reader can see it. **Anything that draws rows
paginates**, and the paging is there from the first row rather than appearing at the thousandth;
`total` comes back beside `rows` so a widget knows what it did not get.

**A widget is checked by the plugin, not by the person who wrote it.** `checkWidget` in
`src/widget-check.js` reads a widget's own source, sheet and card and names six things a generated
widget gets wrong: a colour written by hand instead of a `--wg-kit-*` token, type written by hand
instead of taken from the host, rows drawn from a list read with no limit, a manifest naming no
role, a name imported from `widgetarium` that its surface does not carry — the one defect that
crashes a widget the moment it draws and that nothing else catches until it does — and an `h1` or
`h2` drawn inside a widget whose role is not `text`, which is a region title written into the plate
instead of standing beside it as markdown. It ships inside the
plugin and runs as `widgets.mjs check <id>`, exiting 1 while anything is
wrong — the agent's own gate, not a repository one. `tools/lint-code.mjs` stays what it was: this
project's utility over `src` and `widgets`, and it knows nothing about colours.

**A default is a value kept in the tile, never a path.** `defineManifest` refuses a default naming a
vault folder or file: a widget touches a person's notes only through a binding the person made.

**A tile's verbs are switched on by the person.** A binding carries `allow: [verbs]`; binding a folder
in the settings window writes the widget's `writes` there, and the Data tab switches each one off and
on. A vault binding with no `allow` only reads (`list`, `get`); a binding to rows kept in the tile may
do whatever the widget declared. `allowedVerbs` in `src/gateway/props.js` decides, and a cut verb answers
`can() === { can: false, reason }`.

**A tile names the version it was made with.** `widget: "@scope/name@<commit>"` for a widget installed
from a repository, a bare id for one that lives in the vault; `widgetKeyOf` in
`src/engine/widget-ref.js` is what every comparison of widget ids goes through. An update is compared
with what is installed by `src/engine/compatibility.js`: a compatible one replaces the files in place
and the generation absorbs its commit; one that breaks tiles — a removed or reshaped prop, a changed
default, a rename without `aka` — installs beside it as `@scope/name@<commit>`. A tile moves to a
newer generation only by a press, through the widget's `migration` when one covers the old props. A
note naming a commit the vault lacks offers to install that version.

## The laws that cost the most to learn

**A record's identity is an id, not its name.** Full decision in `docs/record-identity.md`. A UUID in
frontmatter under a namespaced key, exposed as `record.id`; stored references use it, names are
labels. **Assigned only on an explicit action, never on render** — a gateway that writes while being
drawn litters the vault. Everything must work for records with no id yet: resolve id first, name or
path second. Duplicate ids come from **copies**, not from generation; the survivor is the one whose
path sorts first, detection is on read, and the re-mint is a write, so it waits for one.

**There are no settings. Every prop is a gateway, primitives included.** A list of named things —
tabs, views, columns, boards — is a `CollectionGateway`. A single thing is a `ValueGateway`, and the
card the build writes names what it holds: `{ "kind": "value", "control": "number" }`,
and `line`, `text` and `boolean` alike. The control is what the settings window draws from — a
switch for a boolean, a one-line field for a number or a `line`, an area resized downward for a `text`,
JSON for anything else — and it is what
lets a number typed into the tile be re-bound to another widget without touching the widget that
reads it. `here` is a solo gateway with `get`/`update` and deliberately no `list` and no filters,
because a solo thing needs no collection surface.

**A value kept in the tile answers in the tick it is asked.** A gateway whose handlers touch no I/O
declares `settlesNow`, and the cache settles it on the first read rather than a microtask later.
Without it every number read through `useData` is `isLoading` on its first frame, and a number that
lives in the tile itself blinks on every mount.

**A setting is never read as a prop.** `tile.settings` is not consulted for any prop. A value a person
typed is `{ from: typed, value }` for a value and `{ from: typed, rows }` for a list, and `typedIn` in
`src/gateway/props.js` is the one place that knows which key a prop's data lives under.

**One law, three storages.** Where a list can live in more than one place, the verbs — add, rename,
archive, reorder, delete — are written **once** over rows, and each storage supplies only
`read()` / `write(rows)`. Two code paths for one operation is the disease that produced `views`
meaning three different things, slot versus mount, and archived columns living in two places.

**A board is a record, and its columns are a field of it.** A widget that draws a board declares one
prop — `{ "kind": "value", "picks": "<the selection prop>", "of": "<the collection>" }` — and the
engine resolves it to the **row** that selection names, not to a field of that row. Archived is a
field of the column (`archivedAt`), never a second list and never a map keyed by board name. A board
with no note of its own answers from the row its tile keeps. There is no `board` bus and no `configureBoard`: the only board-wide
command left is `foldIntoGroup`, because folding tiles into a group is an action, not data.

**The grid is gone, and a board is one recursive tree.** `layout:` is a **node**, and a node is one
of two things: a **leaf** — a tile, `{ id, ratio, height }` — or a **box** — `{ dir: "row" | "column",
of: [...] }` carrying the same `ratio` plus `width`, `keep`, `collapse`, `folded` and
`scroll`. A box nests to any depth, which is the whole point: `[[A], [B, [C over D]]]` is
expressible, and the three named regions were not able to say it. Full decision in
`docs/board-tree.md`.

**A height belongs to the widgets, never to a box.** A box is as tall as what it holds, which is
what lets a row stack without spilling over the boxes below it. A grip resizes the line above it, so
a row gives all its widgets one height and a stacked row's grip is its last widget's. `height` is the
height with the row standing whole; `heights: { n: px }` is the height while it stands `n` across,
read from the nearest wider `n`, written by a resize in that arrangement and dropped when the widget
is carried to another box. A gap stands between siblings, never after the last. A box `height` in a
note is read once and handed to its widgets (`handedDown`).

**Views are a box, not a widget.** A box with `dir: "swap"` and an `id` draws one named child at a
time and keeps the rest mounted, so their refs survive a tab change. It publishes `<id>/holds` and
`<id>/selection` itself; the selection is a view cell, never written to the note. The add, rename,
archive, restore and delete of a view are the tab-rows law applied to the box's children
(`withHolds`), and deleting a view takes its tiles off the board in the same write. A drop never
lands as a sibling of a swap child — a drop names nothing — so it falls through to the view on
screen and wraps. `@default/view-group` is read into a swap box that keeps the group's id, its mounted
records become tiles, and the box answers to the widget id in wiring so a switcher that `wants` the
group finds it. Full decision in `docs/board-tree.md`.

**A background belongs to a group, not to a widget.** The engine draws every widget's root — its
container query, size and clipping — and a widget draws no background on its own; `WidgetRoot`
survives only as a bare element for widgets written before. Any node may wear `surface: group |
object | item | apart | none`, named for what the node **is** rather than for how it is painted, so a
design system may repaint any of them without the name lying: a `group` is several things answering
one question, an `item` is one member of a set lying on its group, an `object` is a thing lifted off
the page that a person acts in, and `apart` is a boundary with no plate. An `item` stands only on a
`group`. The older words are read once at `normalizeBoard` through `SURFACE_WAS` and never written
again. A
slot wears one too: the manifest's `slots.<name>.surface` is the default, a tile's `slots.<name>.surface`
the pick, and `surfacedSlot` wraps every item the slot draws in that plate, so the widget in a slot
draws no background either — a kanban's `task-card` lies in a `raise` its manifest names. A prop the
parent does not feed a slotted widget arrives as a gateway over its declared default (`slotDefaults`),
and a list is read a page at a time with `{ offset, limit }` (`pageOf`), which is how `@default/feed` loads
ten more each time its end comes into view. A widget names its
`role` in its manifest, a group names `role` and `purpose` on its box, and the role bounds how far it
may be set apart. The nesting table in `src/surface-roles.js` is absolute: an `outline` is only ever
the first plate from the region, a `fill` inside a `fill` is one step darker because the token is
translucent, and a `divider` stands anywhere; a plate whose every child wears a plate is an error.
The laws in `docs/ai/surfaces.md` are run by `src/surface-laws.js` over what `src/surface-measure.js`
read off the drawn board — never by eye, and when in doubt, none. **The laws the tree alone can
answer — N, 5 and N2 — are a gate, not advice**: `wornSurfaceAt` decides and writes in one call, so a
surface the laws refuse cannot be written at all, and the Design tab draws the refused ones disabled
with the law that refused them. Everything the drawn board decides stays advice from
`widgets.mjs surfaces`.

**Spacing is read off the tree, never written.** A region is a child of the root; a box's children
stand 24px apart in a region, 16px one box down, 8px deeper, one step closer after a `text` widget and
between repeats of one widget, and a `swap` adds no level. Each step is what the eye sees, never under
8px: between two plates one plate's padding is taken off, so cards stand close at every level; from a
plate to bare content the step is drawn in full; a bare widget is measured from its first content, the
empty edge `src/content-insets.js` finds inside it taken off. So grouping is the only decision, and a box of its parent's direction with no
surface and no heading is a phantom `lint` names. A `pad` in a note is read and dropped. Corners are
never written either: every plate is rounded concentric with the one around it, re-laid on every
change. `src/board-lint.js`,
run as `widgets.mjs lint <note>`, is the check the agent runs after every write. Inside a widget the
same steps arrive as CSS: every cell carries `--wg-gap-items`, `--wg-gap-parts` and `--wg-gap-cards`
from `gapVarsOf(level)`, and `SlotList` in the kit spaces a slot's items by the cards gap when the slot
wears a plate. A gap written as a number in a widget is what `npm run audit:gaps` lists.

**Behaviour lives on a property, never on a name.** The root is a row of three boxes and the middle
one carries `keep: true`, the two beside it `collapse: { into: drawer, toggle: always }` — that is all `left`, `main` and `right`
ever meant. Nothing outside `normalizeBoard` may compare a node to a name; a box is addressed by its
**path**, an array of indexes from the root, and `sideOf` turns a path into the word an icon and a
label need, which is presentation and nothing else.

**Both older shapes are read once and never written again.** A note carrying `layout: { left, main,
right }` becomes the root row at `normalizeBoard`, and a note carrying only the grid's `layouts:` map
of `{x, y, w, h}` places is read too — the widest authored width, its places sorted by `y` then `x`,
grouped into rows, `w` as the ratio and `h` as pixels — so a board laid out in the grid opens looking
like itself and is rewritten as a tree by the first edit. Nothing renders, offers or emits a grid:
`src/layout.js` and its arithmetic are deleted, and a board written as a tree declares `v: 2`, which
is what stops an older plugin from silently flattening it.

**A box that does not fit collapses into what it declares.** Any box may carry `collapse: { into,
toggle }` — `into` is `stack | drawer | sheet | menu | hide`, `toggle` is `always | adaptive`; a bare
kind is short for `{ into: kind, toggle: adaptive }`, and an old `foldable: true` is read as
`{ into: drawer, toggle: always }` and never written. Nothing is chosen by breakpoint:
`columnsOf` still answers for the root's children in four words — `beside`, `floating`, `hidden`,
`alone` — and a nested row that cannot give its children their floors takes the children carrying a
`collapse` out of the row (`laidRowWithout`), or leaves its parent whole when it carries one itself.
A collapsed box is drawn on the layer the dialog already owns: a portal into `document.body`, `fixed`
over the whole Obsidian window, `--wg-overlay-scrim`, `--wg-kit-raise` with an edge and no cast
shadow, growing from the point that was pressed. Its widgets stay mounted while it is shut, because
refs live only while the widget is on the tree. **Whether it is open is a fact about this screen, not
about the note**: a view cell keyed by `openKeyOf`, `folded:` keeps governing only the docked case,
and a resize that gives the box its place back never writes anything.

**A collapsed box is opened from Obsidian's header or from a toggle it names.** The board has no bar
of its own. `TreeBoard` hands `onActions` one action per box that names no `trigger`, keyed
`box:<openKey>` so the button survives every change of state, with `isOn` while the box is shown; a
`toggle: always` box has one on every screen (folding while docked, opening while collapsed), a
`toggle: adaptive` box has one only while collapsed. `src/header-actions.js` places them with `view.addAction`
beside the reading-mode button, next to the edit-mode pencil. A box naming `trigger: t1/open` reads that `@default/toggle` tile's memory cell
instead, and no header button appears for it. The box reads the toggle; the toggle knows nothing of
the box.

**There is no line between regions.** The board is drawn inside a note, under Obsidian's own chrome,
so a border between two root boxes has neither a top nor a bottom to reach — it dies in the middle
of the page. The gutter is the boundary, and it is `REGION_GAP_PX` wide.

**A box exists because it is declared, not because it holds something.** An empty side box is a
real region: it draws as a zone, a carried tile can be dropped into it, and the pointer is answered
across the whole column rather than only where its widgets reach. This is what lets a board be filled
at all — a sidebar that appears only once something is in it can never receive the first thing. A new
board is born with all three, and all three stand in reading mode too.

**A widget is added where it will stand.** Every column box ends, while the board is being edited, in
a press that opens the catalogue and puts the pick at the end of **that** box. There is no board-wide
add: a press that named no box left the person guessing where the widget went.

**A tile is carried to a path, and the drop says what it means.** A carry measures every box and leaf
on the board, takes the deepest one under the pointer, and reads the pointer against it: along the
parent's own direction the tile becomes a **sibling** at that index, and across the grain it **wraps**
the node it landed on in a new box of the axis it was aimed at. That is how nesting is made by hand,
and it is why the drop needs no gesture of its own. Removing a tile, or carrying the last one out of
a box, prunes the box — unless the box declares something, because a declared empty box is a region
and a region stays.

**A fed slot cannot be entered; an unfed one can.** A slot whose manifest declares `gives` gets its
inputs from the parent and owns nothing. Without `gives` the child owns its own props.
`docs/view-group.md` carries this; it replaced an earlier split between "slot" and "mount".

**One widget points at another by ref, never by a shared name.** There is no context bus. A ref is
`<tileId>/<propName>`; the board holds one registry of them (`src/gateway/refs.js`) and a where row
carries `{ ref }` where a value would stand. A selection — which tab, which view, which card is open
— is a box the engine owns over the very list it selects from, so a pick that names a row the list
no longer holds is no pick at all. Full decision in `docs/prop-bindings.md`.

**Declared is not rendered.** Six rounds shipped with every gate green and were rejected on sight.
A value sliced by a selection must be read through its gateway **inside the widget that draws it**,
with `useData`. One level up gives a correct declared value and a stale screen.

**A markdown post-processor is reading mode only.** Live Preview is a different engine and needs a
CodeMirror 6 editor extension. Reading view also caches rendered sections and unloads off-screen ones.
Sources, quotes and the ranked causes are in `docs/research/post-processors-and-live-preview.md`.

**Three versions, and only one of them is semver.** The plugin's `manifest.json` version is
Obsidian's business. The two that cost are `v:` stamped into every block written, and `api:` in a
widget manifest against the range the plugin holds. Both read a missing number as 1, and both
REFUSE rather than guess: a block from a newer plugin is not mounted and therefore never written
back, and a widget outside the range does not mount, install or draw. The numbers and the rule for
raising each are in `docs/versioning.md`; they live in `src/version.js`.

**The build is the engine's, and it runs on the person's machine.** A widget folder holds only what
its author wrote; everything the engine makes lands in `build/` beside it — `widget.js` from the TSX,
`widget.css` when the sheet asked to be compiled — and a vault wears the built sheet in place of the
author's. `tools/publish.mjs` is the author's check that it all builds, not the thing that builds it.
What is built is a fact of its own: `lock.builds[id]` names the source, the compiler and a hash per
input, separately from `lock.widgets[id]`, which only means installed from a repository. At load and
at every widget-folder change the engine asks each folder whether the files its build was made from
are still the files on disk, and rebuilds the ones that answer no — which is why an edit in a
symlinked scope shows with no install. `node tools/build-vault.mjs` runs that same pass from the
terminal.

**Tailwind is asked for in CSS and answered at build time.** A `widget.css` opening with
`@import "tailwindcss"` is compiled by the real `tailwindcss` package, fetched into the vault's module
space like any other dependency and never loaded to draw anything. The theme is CSS too — `@theme`
over `--wg-kit-*`, in the widget's sheet or in a scope file it imports — so the configuration lives
outside the widget. Preflight is never imported: it restyles the host's own elements, and a sheet that
asks for it is refused by name. A widget whose styling needs this declares `api: 2`.

## Next tasks

Remind the person of this list at the end of every finished task, until each is done.

- [Only reviewed commits reach a vault](.tasks/approved-commits/artifacts/task.md) — until a curator
  list of approved commit hashes exists, every commit a registry serves installs unreviewed.
- [Widget code cannot reach past its gateways](.tasks/widget-code-scanner/artifacts/task.md) — kit
  APIs for window events and portals, then a scanner refusing `window`, `document` and
  `ownerDocument` in widget source.
- **What the engine hands over is declared too** — `host`, `navigator`, `here` and `slots` arrive
  silently today. They belong in `props` beside the data, each declared by its own function
  (`defineHost()`, `defineNavigator()`, `defineSlot()`), so a widget asks for what it uses and the
  tile can answer. It is the same law as `writes`, one level up.

## Verification

**Falsification is the rule: a check that cannot be broken on purpose proves nothing.** For every
check, mutate the source to violate the law it claims, confirm it goes red, restore with a
uniqueness-asserted targeted edit, verify by md5. If a check turns out unfalsifiable, delete it —
along with whatever depends on it — rather than ship it.

`npm run test:paint` drives real headless Chrome and reads **resolved** computed values; the jsdom
suites resolve no cascade and lay nothing out, so a CSS claim proved only there is not proved.
`test:dialog`, `test:view` and `test:tree` are timing-flaky — re-run alone before blaming a change.

## The design direction: Material 3 Expressive and Apple

**Two references, one job each.** Google's Material 3 Expressive and Apple's current system are what
this plugin is measured against. Neither is copied as a look — a Material component dropped into an
Obsidian plugin fights the host's theme and loses. What is taken is the practice, and the practice is
the same on both sides: **maximalist, physical, answering.**

- **Shape carries the accent, not only colour.** An element earns attention by having a form the ones
  around it do not. The 35 outlines in `assets/shapes/` are the vocabulary; `node tools/fetch-shapes.mjs`
  regenerates them. One unusual form per widget, on the thing the eye is looking for.
- **An emoji is a drawing, not a character.** A typed emoji renders as whatever font the host has;
  `<Emoji name="smiling-face-with-halo"/>` from `widgetarium/kit/emojis` renders the same everywhere.
  The 129 Microsoft Fluent faces are the vocabulary — the Unicode group "Smileys & Emotion" up to the
  monkeys, and nothing else. `node tools/fetch-emojis.mjs` regenerates `src/emoji-table.js`; the
  licence sits in `assets/emojis/`. They cost 300kb of the bundle, so they hang off their own
  specifier and no widget pays for them unless it asks.
- **An icon is a name the kit resolves, never an import.** `<Icon name="anchor"/>` from
  `widgetarium/kit` draws the kit's own 35 glyphs first and the whole of Lucide behind them — one
  name, one drawing, and a kit glyph wins a name Lucide also holds. `node tools/fetch-icons.mjs`
  regenerates `src/icon-table.js` from `lucide-static`; the licence sits in `assets/icons/`. Lucide
  is drawn on its own 24 grid, so the kit scales its stroke to the weight of the 20 grid rather than
  letting two families sit at two weights. Obsidian's own set is refused: `setIcon` draws nothing in
  a catalogue shot or a paint test, and a drawing that only exists inside the host is not a drawing.
- **Big.** Large controls, large corners, generous spacing. A dense grid of small buttons is the
  design this project is deliberately not.
- **Motion is the answer to a press**, not decoration on load. Springy, interruptible, immediate;
  a control that moves under the finger. Both references spend their budget here — so do we.
- **A corner is never where the text goes.** Under a large radius the corner belongs to an icon or a
  shape; text stays inside the safe box. A radius that eats a word is the radius, not the word.
- **What is refused:** the `@material/web` runtime, Material's colour roles, its base components. They
  arrive with their own tokens and a Shadow DOM, and this project's colours come from `--wg-kit-*`.

## A widget change is not done until the vault has it

**Every widget change is two steps: build, then put it in the vault.** A green test suite is not a
change a person can see. Nothing in the repo reaches Obsidian on its own, and the two halves fail
differently, so both must be done and both must be checked.

```bash
npm run dev            # build + install: the plugin as a symlink, for working
npm run install-vault  # build --prod + install: a production copy, for using
```

**The engine is copied, the widgets are symlinked — except where they are not.** `install.mjs` copies
`main.js`, `styles.css` and `manifest.json` into `.obsidian/plugins/widgetarium`, so a change to `src/`
that was never installed leaves the vault running yesterday's engine. Under `.widgetarium/widgets` each
scope is normally a symlink back to this repo, and for those a widget edit is live with no install at
all. **A scope that is a real directory is a published copy and is frozen** — edits to the repo never
reach it, and a scope installed from the catalogue is exactly such a copy. Check before believing an
edit landed:

```bash
ls -la "$WG_VAULT/.widgetarium/widgets"
```

**A new widget is invisible until it is put there.** Adding a folder under `widgets/` changes nothing
in the vault: a symlinked scope picks up a new folder inside it, a copied scope does not, and a new
scope exists nowhere until it is linked or published. When a change does not show, look here first —
before re-reading the code, before blaming the cache, and before reloading the plugin a third time.

## House rules

- All colours from `--wg-kit-*` tokens; no hardcoded colours. The kit's controls paint fill and corner
  on a `::before` — the element itself is `border-radius: 0` by design.
- Comments only with the prefixes `TODO:` and `TRADE-OFF:`, fewest possible words. `CONTEXT:` is
  gone: a fact the reader needs belongs in a name. A hook blocks anything else, on edits and on
  shell writes alike.
- Every string is English; `npm run lint:lang` must pass. Never build a sentence by concatenation —
  author the whole sentence with a placeholder.
- Early returns over nesting; no proxy variables; every new entity needs a consumer.
- Migrations are **lazy**: reading accepts the old shape, writing emits the new one, and nothing bulk
  rewrites the vault. A prop's `was` carries every name it had. Until the first release this law is
  suspended for the manifest and tile shapes: boards written before are rebound by hand, and every
  version number (`api`, `v`, `registry`) is reset to 1 on the day of release.
