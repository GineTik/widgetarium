# Widgetarium

An Obsidian plugin: widget tiles in a nested layout inside a note, plus rules that substitute a
widget for a line of text. Every `src/` is React with `h()` hyperscript — **no JSX there**; the gateway layer under
`packages/core/src/gateway/` is TypeScript (`tsc --noEmit` gates it), the rest is untyped JS that dies
in place rather than being typed. Widgets under `registry/` are `.tsx` compiled at runtime by
sucrase (types stripped, never checked — the contract holds through `can()` and the engine, not tsc).

**The repository is an npm-workspaces monorepo, and the arrows between its parts point one way.**

```
apps/obsidian     FSL  the host: mounts core in a note, gives it the vault as its gateways
      ↓
packages/core     FSL  the board builder: tree, engine, gateways, renderer, laws
      ↓
packages/kit      MIT  everything drawn: Card and its plate laws (plates.js), Layout, Icon, emojis
packages/sdk      FSL  what a widget author compiles against: types/widgetarium.d.ts
registry/         MIT  the widget library everyone installs from: @default, @flow, @media
```

**Kit imports nothing but React; core never imports the app.** A plate law lives in
`packages/kit/src/plates.js` because `Card` answers it, and `tree.js` and `surface-roles.js`
re-export it from there. The app reaches core as `@widgetarium/core/<file>` and the kit as
`@widgetarium/kit[/surface|/plates|/icons|/emoji-table|/emojis|/shapes|/dicebear]` — the kit's
`package.json` `exports` is the one list of its entry points, and `tools/mirror.mjs` reads it to lay
the test cache flat. Every tool runs from the repo root. A second host (web, Tauri) is another
`apps/*` beside `obsidian`, never a branch inside core. Licences: each package folder carries its own `LICENSE`; the root `LICENSE` is only the
map of which folder is MIT and which FSL-1.1-ALv2, and `REUSE.toml` maps paths to them.

**The handbook written for the in-app agent is your handbook too.** `docs/ai/` is the whole of it:
`brief.md` is the prompt, `board.md`, `surfaces.md` and `examples.md` go into the agent's context in
full, `widget.md` and `tools.md` are laid on disk and read when needed, and `chat-brief.md` is the
prompt a provider that cannot edit gets instead. `examples.md` is the one that does the work — whole
boards with a surface on every node, because the agent copies a screen far more reliably than it
applies a rule. Read the page that covers a change before touching the code, and keep it true in the
same change: a law that changed in code and not there is a law the next agent breaks. Why the shapes
are what they are lives in `docs/decisions.md`.

**A screen is built in three stages, and the order is the law.** `brief.md` holds them. Stage 1 is
the domain: the record shapes the screen must show, one folder per kind, seeded with real rows, and
the fields the domain needs rather than only the ones the vault happens to hold. Stage 2 is the
design in words, region by region, and **the form is chosen there** — a board of tiles is one answer
to "how should this be shown", a page of prose, a single full-bleed widget or a deck are others, and
the data picks none of them. Stage 3 is the screen: search the catalogue for what fits the design,
write a widget for everything that does not, place, bind, surface, lint, measure. Measured before
the order was written down: the board that came out of starting at stage 3 had five of seven tiles
on their defaults and one surface on nine nodes, and `lint` called it valid. **The catalogue is not
the ceiling on the design** — the old wording, "write a widget only when nothing fits", made it one.

**A screen note holds the board and nothing above it, and the board claims the window.** Two
defects hid behind each other here. `kind: screen` painted nothing at all: its only rule,
`.wg-root.is-screen .wg-grid`, aimed at a class no file has rendered since the grid became a tree,
so the flag the handbook documents was dead CSS. And the first version of stage 2 told the agent to
leave its design write-up in the note it was building — which put 41 and 43 lines of prose in front
of two screens before anyone noticed. The rule now lives on the root and on `.wg-tree-page`, is
measured in real Chrome by `tools/tree-test.mjs` against the viewport, and the design goes in a note
of its own. `is-page` stays a separate thing: `mode: expanded` changes the board's padding, a screen
only claims height, and conflating them moved every drag measurement in the tree gate.

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

Every prop is `defineProp<Held>()({ ... })` from `packages/core/src/gateway/manifest.ts`, and **the type it holds
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
same answer: `describedFields` and `needsOf` in `packages/core/src/gateway/props.js` — the field list the settings
window draws, and the fields that take part in matching a note's properties — `inputsOfProp` in
`packages/core/src/reading.js`, which counts them to classify the prop's reading, and `typesIn` in
`apps/obsidian/src/ai/find-command.mjs`, which collects their types to rank a search. The line between the first
two is `aka`: **a field takes part in matching a note's properties exactly when it
names other names.** Without `aka` the widget reads the field under its own name, and `describes`
only tells the settings window how to draw it.

**A row is the record, and `ref` is its address.** `Row<T> = T & { ref }` — there is no `{ ref, value }`
wrapper, so a widget writes `entry.title`, keys by `entry.ref`, and `useData` answers with `data`
alone: an array for a list, the value for a value, `total` beside it. `ref` in a row type must be
typed `RecordRef` or left out, and `defineManifest` refuses a described or defaulted `ref` outright.
`rowOf` and `valueIn` in `packages/core/src/gateway/create.ts` are the only places an address is put on or taken
off. A list of primitives is the one exception and keeps `{ value, ref }`, because a string has
nowhere else to hold itself.

The engine resolves each prop to a gateway from the binding the person chose — a vault folder or
file, a value kept in the tile, or another tile's ref. Widgets read through `useData(gateway.list)`
and write through verbs; every verb is asked through `can()`. The manifest carries no id, no version
and no api: the id is the folder, the version is the commit, the api is stamped by the build.
**A surface is written by whoever places the node, and nothing lays one for you.** `main.js` no
longer hands `normalizeBoard` a `roleOf`, so `withDefaultSurfaces` in `packages/core/src/surface-default.js` does
not run on a drawn board: it survives behind that switch, with `tools/surface-default-test.mjs` as
its only caller. Measured before the switch was thrown, by `tools/surface-probe.mjs` over three real
screens: the writer wrote `apart` on navigation columns and **nothing else**, because `wantsWriting`
requires `isBox(node)` and a tile is a leaf; `surfaceVerdicts` meanwhile advised `group` on every one
of those tiles. Two paths, disagreeing, neither reproducing the reference design — which is why the
agent now decides. `tools/surface-shapes.mjs` holds the other half of the finding: a box takes a
plate only when it has sibling boxes, because `decided()` refuses a box that stands alone in its
parent. **The agent gives every node its surface as it places it**, guided by `docs/ai/surfaces.md`;
`widgets.mjs surfaces` reads a **drawn** board back and says which plates look wrong beside each
other, and is never a source of surfaces to write.

**A screen starts from a base, and the board remembers which one.** `packages/core/src/layouts.js` holds the
fifteen page skeletons a screen may begin as — `page`, `page-composed`, `workspace`, `three-pane`,
`supporting-pane`, `split`, `surface`, `journal`, `analytics`, `library`, `gallery`, `atlas`,
`showcase`, `notebook`, `drill` — each cutting the page into regions that carry their `role`,
`purpose`, `surface` and whether they are kept or collapse, each region already holding its named
sections, and **no widgets anywhere**: a section is a plain column with a `name`, never a node kind
of its own, and which widget stands in it is the design's answer rather than the shell's.
`widgets.mjs base <name>` hands the skeleton over with the surfaces already on the nodes, so the base
writes them into the note rather than competing with the laws at draw time. `base:` survives
`normalizeBoard` and `serializeBoard`, which is what lets `lint` hold a built screen against what was
declared: a region count that does not match, a region holding the wrong role, a declared region left
empty. A shell named only in the chat was thrown away, and that is why the same request produced a
different screen every time. `packages/core/src/patterns.js` is now only the card shapes — what a card wears alone
and among peers — which is a different question from how a page is cut.

**The agent sees the whole catalogue, not the vault.** `widgets.mjs find` merges what is installed
with what every configured source offers, and `packages/core/src/engine/registry-file.js` is the one reader of a
registry — a source naming a `path` on this machine is read off disk, one naming a `repository` is
fetched, and both come back through `readRegistry`, which is what turns a registry's `scope` and a
row's `name` into an id. An offered row carries its folder, so it is ranked by the role and the
fields its own manifest declares rather than sitting at zero, and `widgets.mjs install <id>` writes
it and its scope's shared files into the vault and records the install in the lock, leaving the build
to the engine. Everything the plugin still owns is the remote fetch. A vault whose catalogue
answers with only what it already holds is what makes an agent write a widget that exists.

`manifestOf` in `packages/core/src/engine/catalogue-index.js` is the one place a declaration becomes the manifest
the engine reads; an old `createWidget(component, { props })` still passes through `legacyProp` there
until the last shipped widget moves.

**A widget folder is typed wherever it stands.** The repo has `registry/tsconfig.json`, so an editor
opening a widget resolves `widgetarium` instead of reporting `TS2307` and handing every prop `any` —
`packages/core/tsconfig.json` covers only the gateway's TypeScript. The vault gets the same: `layAgentFiles` lays
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
`packages/core/src/widget-check.js` reads a widget's own source, sheet and card and names six things a generated
widget gets wrong: a colour written by hand instead of a `--wg-kit-*` token, type written by hand
instead of taken from the host, rows drawn from a list read with no limit, a manifest naming no
role, a name imported from `widgetarium` that its surface does not carry — the one defect that
crashes a widget the moment it draws and that nothing else catches until it does — and an `h1` or
`h2` drawn inside a widget whose role is not `text`, which is a region title written into the plate
instead of standing beside it as markdown. It ships inside the
plugin and runs as `widgets.mjs check <id>`, exiting 1 while anything is
wrong — the agent's own gate, not a repository one. `tools/lint-code.mjs` stays what it was: this
project's utility over every `src` and `registry`, and it knows nothing about colours.

**A default is a value kept in the tile, never a path. This is a security law, not a style one.**
A default is static data the widget ships with: strings, numbers, booleans, arrays, plain objects.
Nothing in it may name a file or a folder.

The reason is what a path in a default would buy an author. A widget whose default points at the
vault is reading a person's notes **before they have chosen anything** — and a widget declaring a
destructive verb could then delete files on first render, with no binding made, no consent given and
nothing to undo. The person names the path in the settings window, and only then does the widget
touch anything. That order is the whole protection, and a default naming a path removes it.

`defineManifest` refuses it: `carriesKey` in `packages/core/src/gateway/manifest.ts` walks a default to any depth
and refuses `path` in an object, in an array's rows, or nested inside either. `ref` is refused the
same way, because a row's address is minted by the engine. Measured before the walk was added — the
two checks used to be mirror images of each other's holes: `path` was caught only on a plain object,
`ref` only on array rows, and neither looked one level down.

**A widget that renames its way around this is refused too.** `filePath`, `at`, `file` or any other
spelling of the same thing is the same defect; the name heuristic is what the engine can enforce, not
what the law means. A widget shipping a path-shaped default does not reach the catalogue.

**A tile's verbs are switched on by the person.** A binding carries `allow: [verbs]`; binding a folder
in the settings window writes the widget's `writes` there, and the Data tab switches each one off and
on. A vault binding with no `allow` only reads (`list`, `get`); a binding to rows kept in the tile may
do whatever the widget declared. `allowedVerbs` in `packages/core/src/gateway/props.js` decides, and a cut verb answers
`can() === { can: false, reason }`.

**A tile names the version it was made with.** `widget: "@scope/name@<commit>"` for a widget installed
from a repository, a bare id for one that lives in the vault; `widgetKeyOf` in
`packages/core/src/engine/widget-ref.js` is what every comparison of widget ids goes through. An update is compared
with what is installed by `packages/core/src/engine/compatibility.js`: a compatible one replaces the files in place
and the generation absorbs its commit; one that breaks tiles — a removed or reshaped prop, a changed
default, a rename without `aka` — installs beside it as `@scope/name@<commit>`. A tile moves to a
newer generation only by a press, through the widget's `migration` when one covers the old props. A
note naming a commit the vault lacks offers to install that version.

## The laws that cost the most to learn

**A record's identity is an id, not its name.** Full decision in `docs/decisions.md`. A UUID in
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
`packages/core/src/gateway/props.js` is the one place that knows which key a prop's data lives under.

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
`docs/decisions.md`.

**A widget prefers a size and is promised none.** Every manifest declares `size.preferredWidth`
(pixels or `"full"`) and `size.preferredHeight` (pixels or `"auto"`) — `defineManifest` refuses one
without — and may add `keepsRatio` and `at`, steps keyed by the width of the **region** it stands in
(`regionPx` from `laidRegion`), never the screen, switching at once like a `max-width` query.
`preferredSizeAt` in `packages/core/src/tree.js` picks the size for a region and `preferredSizeStyle` in
`packages/core/src/surface.js` draws it: the width as the cell's `max-inline-size`, the height as its `min-height`
or, with `keepsRatio`, its `aspect-ratio`, each widened by the plate's padding when the cell wears one.
A widget with more to draw grows past its preferred height; one that needs a hard size bounds its own
container in its sheet. `tallestPx` and `shortestPx`, bounds the engine used to enforce, are gone.

**Only a region is sized by hand, and only across.** A widget is as tall as what it draws, leaning
toward its preferred size, and a box is as tall as what it holds — which
is what lets a row stack without spilling over the boxes below it. There is no grip between two
widgets and none under one: the one handle left is the edge between two regions, and it writes that
region's `width`. A person-written height cut widgets off and a ratio dragged between tiles squeezed
them past what they could draw, so both are gone: `height`, `heights` and a mount's `height` are read
and dropped by `normalizeBoard`, never written, and named as gone by `lint`. A `ratio` written in a
note is still honoured; nothing writes a new one. A gap stands between siblings, never after the last.

**Views are a box, not a widget.** A box with `dir: "swap"` and an `id` draws one named child at a
time and keeps the rest mounted, so their refs survive a tab change. It publishes `<id>/holds` and
`<id>/selection` itself; the selection is a view cell, never written to the note. The add, rename,
archive, restore and delete of a view are the tab-rows law applied to the box's children
(`withHolds`), and deleting a view takes its tiles off the board in the same write. A drop never
lands as a sibling of a swap child — a drop names nothing — so it falls through to the view on
screen and wraps. `@default/view-group` is read into a swap box that keeps the group's id, its mounted
records become tiles, and the box answers to the widget id in wiring so a switcher that `wants` the
group finds it. Full decision in `docs/decisions.md`.

**A background belongs to a group, not to a widget.** The engine draws every widget's root — its
container query, size and clipping — and a widget paints a plate only through `<Card>` from the
kit; `WidgetRoot` survives only as a bare element for widgets written before.

**The tile's plate is the node's, the plates under it are the widget's, and one component paints
both kinds.** `Card` in `packages/kit/src/kit.js` (once `Surface`, which stays as an alias for widgets published
before the rename) takes `type` — `group` by default, `none` for a widget that paints nothing — plus `tone` for a plate in a state and `side`/`across` for
a divider. It reads `PLATES_ABOVE` (`packages/kit/src/kit-surface.js`), seeded from the laid node's own `plates` and
`underSurface` — **inside the tree handed to the tile's shell, because a widget is drawn in its own
render root** (`DrawnInShell` in `packages/core/src/mounted.js`) and no context crosses that seam. Measured: a Provider
around the cell body left every widget counting from zero, and the third plate painted itself white
on a drawn board while every jsdom check stayed green. Every plate under it provides the next level,
so a widget's Surface is judged by the very laws the tree is judged by: `plateRefusal` in `packages/core/src/surface-roles.js`
is the one function answering whether a plate may stand somewhere, asked by `nestingFindings` for the
note and by the kit for the screen; `tone`, `side` and `across` are held to the kit's own words the
same way, and a word the kit never had falls back and warns rather than reaching the DOM. A named
`data-surface` cannot outrank the computed one — the laws' attributes are spread after a caller's
props, because a prop that could name the plate would be a way past the gate. **A tone replaces the
plate's grey**, which the cascade had to be told: `.wg-kit-tone` is excluded from the group fills by
name, and a jsdom check on the class list said the tone was there while Chrome painted grey. **A refused plate paints nothing and warns** — it cannot reach the
screen and be measured later as a third fill nobody declared. Corners step inward from the tile's
own (`--wg-surface-corner`) and are never written by a widget. The slot wrapper is that component
too, which is what makes a slotted widget's depth right rather than one level short. Any node may wear `surface: group |
apart | none`, named for what the node **is** rather than for how it is painted, so a design system
may repaint any of them without the name lying: a `group` is several things answering one question,
and `apart` is a boundary with no plate. **The page is the theme's colour and a `group`
is a 3% grey with no edge** — `--wg-kit-page` under the board and the pane of a screen,
`--wg-kit-group-fill` on the plate, `--wg-kit-group-edge: none` — and a `group` on another group turns
white (`--wg-kit-group-inset`). **The kit carries the rules for what is drawn inside a widget**:
`Rows` is one plate with a line between its items (`--wg-kit-group-line`), `Grid` gives every cell a
`Card`, and `Layout kind` is all of them behind one word, so a design changes by one prop.
**An `indicators` region lays a `group` on every widget in it** that names no surface — `wornInRegion`
in `packages/core/src/tree.js`, at lay time, never written to the note — except a `text`, `layout`, `control` or
`navigation` widget and one already standing on a plate. The only CSS that decides the colour is `[data-surface="group"] [data-surface="group"]`. `object`, a plate lifted with a
hairline, was a second plate nobody placed and is gone; `item` was a fourth name. Both are read once
at `normalizeBoard` through `SURFACE_WAS` beside `fill`, `outline`, `raise` and `divider` as a
`group`, then never written again. A
slot wears one too: the manifest's `slots.<name>.surface` is the default, a tile's `slots.<name>.surface`
the pick, and `surfacedSlot` wraps every item the slot draws in that plate, so the widget in a slot
draws no background either — a kanban's `task-card` lies in the `group` its manifest names, raised
because the column under it is a group already. A prop the
parent does not feed a slotted widget arrives as a gateway over its declared default (`slotDefaults`),
and a list is read a page at a time with `{ offset, limit }` (`pageOf`), which is how `@default/feed` loads
ten more each time its end comes into view. A widget names its
`role` in its manifest, a group names `role` and `purpose` on its box, and the role bounds how far it
may be set apart. The nesting table in `packages/core/src/surface-roles.js` is absolute: an `outline` is only ever
the first plate from the region, a `fill` inside a `fill` is one step darker because the token is
translucent, and a `divider` stands anywhere; a plate whose every child wears a plate is an error.
The laws in `docs/ai/surfaces.md` are run by `packages/core/src/surface-laws.js` over what `packages/core/src/surface-measure.js`
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
empty edge `packages/core/src/content-insets.js` finds inside it taken off. So grouping is the only decision, and a box of its parent's direction with no
surface and no heading is a phantom `lint` names. A `pad` in a note is read and dropped. Corners are
never written either: every plate is rounded concentric with the one around it, re-laid on every
change. `packages/core/src/board-lint.js`,
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
`toggle: adaptive` box has one only while collapsed. `apps/obsidian/src/header-actions.js` places them with `view.addAction`
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
`docs/decisions.md` carries this; it replaced an earlier split between "slot" and "mount".

**A mount's settings are reached where the mount stands.** While the board is being edited every
mounted widget wears its own press, and it opens the settings window already inside that mount rather
than at its holder — `enterMount` is threaded from the cell down through `WidgetHost` into every
entry, composing a step per level, so a mount inside a mount is reached in one press too. The same
list reorders in place: a mount row carries a move up and a move down, because the order of the rows
is the order they are drawn in. **A mount has the same three tabs as a tile.** Its Design tab holds
its own `surface`, written to `mounted.<name>` and handed to the holder on every
`MountEntry`, plus its own `design: true` props; it holds no fold, no height and no board size, because those
are facts of a place on the board and a mount has none — showing the holder's would edit the wrong
thing.

**A prop says for itself whether it is drawn.** `isVisible` on a prop, a slot or a mount entry is a
function over every prop of the widget — `{ kind, control, binding, isSet, value }`, or `rows` for a
collection — read from what the person typed, falling back to the default. `isShown` in
`packages/core/src/prop-visibility.js` is the one place that answers it, asked by the props group, the slot rows and
the mount groups alike, which is what lets **one switch** put a slot away and bring a mount list out.
A rule that throws draws what it would have hidden and says so: a window with a prop missing and no
reason is worse than a window with one prop too many. The function is code, so no card carries it,
and both sides of the card comparison drop it rather than one of them.

**A section is a widget with the `layout` role, and that role is the middle of three.** A base cuts
the page into regions, a `layout` widget stands in a region and is the only kind allowed to draw its
own `h2`, and every other widget stands inside one. `@default/section` is the one the engine ships:
a heading, a badge, controls as a mount list, and a body that is either the widgets a person placed
(`mounts.widgets`) or one widget drawn again for every row of the data (`slots.item`) — **one switch
between them**, and `isVisible` is what makes the window ask only for the half in use. The body
is drawn through the kit's `Layout`, and `arrangement` is its kind: a `column` stands bare, a `row`
and a `grid` give every widget its own plate, `rows` stand in one plate with a line between them.
The section itself wears no plate, so the heading stands outside every plate and the widget's own
plate laws still count from there.

**One widget points at another by ref, never by a shared name.** There is no context bus. A ref is
`<tileId>/<propName>`; the board holds one registry of them (`packages/core/src/gateway/refs.js`) and a where row
carries `{ ref }` where a value would stand. A selection — which tab, which view, which card is open
— is a box the engine owns over the very list it selects from, so a pick that names a row the list
no longer holds is no pick at all. Full decision in `docs/decisions.md`.

**Declared is not rendered.** Six rounds shipped with every gate green and were rejected on sight.
A value sliced by a selection must be read through its gateway **inside the widget that draws it**,
with `useData`. One level up gives a correct declared value and a stale screen.

**A markdown post-processor is reading mode only.** Live Preview is a different engine and needs a
CodeMirror 6 editor extension. Reading view also caches rendered sections and unloads off-screen ones.
Sources, quotes and the ranked causes are in `docs/decisions.md`.

**Three versions, and only one of them is semver.** The plugin's `manifest.json` version is
Obsidian's business. The two that cost are `v:` stamped into every block written, and `api:` in a
widget manifest against the range the plugin holds. Both read a missing number as 1, and both
REFUSE rather than guess: a block from a newer plugin is not mounted and therefore never written
back, and a widget outside the range does not mount, install or draw. The numbers and the rule for
raising each are in `docs/decisions.md`; they live in `packages/core/src/version.js`.

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
  around it do not. The 35 outlines in `packages/kit/assets/shapes/` are the vocabulary; `node tools/fetch-shapes.mjs`
  regenerates them. One unusual form per widget, on the thing the eye is looking for.
- **An emoji is a drawing, not a character.** A typed emoji renders as whatever font the host has;
  `<Emoji name="smiling-face-with-halo"/>` from `widgetarium/kit/emojis` renders the same everywhere.
  The 129 Microsoft Fluent faces are the vocabulary — the Unicode group "Smileys & Emotion" up to the
  monkeys, and nothing else. `node tools/fetch-emojis.mjs` regenerates `packages/kit/src/emoji-table.js`; the
  licence sits in `packages/kit/assets/emojis/`. They cost 300kb of the bundle, so they hang off their own
  specifier and no widget pays for them unless it asks.
- **An icon is a name the kit resolves, never an import.** `<Icon name="anchor"/>` from
  `widgetarium/kit` draws the kit's own 35 glyphs first and the whole of Lucide behind them — one
  name, one drawing, and a kit glyph wins a name Lucide also holds. `node tools/fetch-icons.mjs`
  regenerates `packages/kit/src/icon-table.js` from `lucide-static`; the licence sits in `packages/kit/assets/icons/`. Lucide
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

**The engine is copied, the widgets are symlinked — except where they are not.** `apps/obsidian/install.mjs` copies
`main.js`, `styles.css` and `manifest.json` from `apps/obsidian/` into `.obsidian/plugins/widgetarium`, so a change to a `src/`
that was never installed leaves the vault running yesterday's engine. Under `.widgetarium/widgets` each
scope is normally a symlink back to this repo, and for those a widget edit is live with no install at
all. **A scope that is a real directory is a published copy and is frozen** — edits to the repo never
reach it, and a scope installed from the catalogue is exactly such a copy. Check before believing an
edit landed:

```bash
ls -la "$WG_VAULT/.widgetarium/widgets"
```

**A new widget is invisible until it is put there.** Adding a folder under `registry/` changes nothing
in the vault: a symlinked scope picks up a new folder inside it, a copied scope does not, and a new
scope exists nowhere until it is linked or published. When a change does not show, look here first —
before re-reading the code, before blaming the cache, and before reloading the plugin a third time.

## House rules

- All colours from `--wg-kit-*` tokens; no hardcoded colours. The kit's controls paint fill and corner
  on a `::before` — the element itself is `border-radius: 0` by design.
- Comments only with the prefixes `TODO:` and `TRADE-OFF:`, fewest possible words. `CONTEXT:` is
  gone: a fact the reader needs belongs in a name. A hook blocks anything else, on edits and on
  shell writes alike.
- **Everything written in this repository is English.** Code, strings, comments, commit messages,
  documentation, a `.md` anywhere in the tree. `npm run lint:lang` must pass. Never build a sentence
  by concatenation — author the whole sentence with a placeholder.
- Early returns over nesting; no proxy variables; every new entity needs a consumer.
- Migrations are **lazy**: reading accepts the old shape, writing emits the new one, and nothing bulk
  rewrites the vault. A prop's `was` carries every name it had. Until the first release this law is
  suspended for the manifest and tile shapes: boards written before are rebound by hand, and every
  version number (`api`, `v`, `registry`) is reset to 1 on the day of release.
