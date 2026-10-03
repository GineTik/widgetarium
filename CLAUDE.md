# Widgetarium

An Obsidian plugin: widget tiles in a nested layout inside a note, plus rules that substitute a
widget for a line of text. **Everything is strict TypeScript**: `packages/kit` is TSX (JSX with the
classic `h` factory, one component per file), `packages/core` and `apps/obsidian` are `.ts` React with
`h()` hyperscript — **no JSX there** — and `tools/` is `.ts` too. `npm run test:types` gates it all
(`tsc -b` over kit, core, the app and tools, then the `double-cast` lint): no `any`, no
`as unknown as`, no `!`; data from outside arrives `unknown` and is narrowed by a guard. Widgets under
`registry/` are `.tsx` compiled at runtime by sucrase (types stripped) and type-checked here against
`packages/sdk/types/widgetarium.d.ts`, which only re-exports the real declarations of core and the kit.
**A widget is TypeScript or it is refused.** `SOURCE_FILES` in `packages/core/src/engine/widget-build.ts`
is `widget.tsx` and `widget.ts`; a folder holding only `widget.jsx` or `widget.js` is answered by
`javascriptSourceRefusal` — on the tile, at install, in `publish`, `manifest` and `widgets.mjs` — with
the rename that fixes it. A `widget.js` beside a TypeScript source is ignored, never read as a build.

**The repository is an npm-workspaces monorepo, and the arrows between its parts point one way.**

```
apps/obsidian     FSL  the host: mounts core in a note, gives it the vault as its gateways
      ↓
packages/core     FSL  the board builder: tree, engine, gateways, renderer, laws
      ↓
packages/packs/*  MIT  every query and command implementation, one workspace per pack (@core, @obsidian, @stats, @git): schemas, *Query, *Command; the host registers them
packages/kit      MIT  everything drawn: TSX, one file per kit item in components/ (emblem, button, layout, popover, …); plate laws in utils/plate-laws.ts
packages/sdk      FSL  what a widget author compiles against: types/widgetarium.d.ts
registry/         MIT  the widget library everyone installs from: @default, @flow, @media
```

**Kit imports nothing but React, tailwind-merge and, behind `/charts` alone, Recharts; core never
imports the app.** A plate law lives in
`packages/kit/src/utils/plate-laws.ts` (the words in `constants/surfaces.ts`) because `Card` answers it, and `tree.js` and `surface-roles.js`
re-export it from there. The app reaches core as `@widgetarium/core/<file>` and the kit as
`@widgetarium/kit[/surface|/plates|/icons|/emoji-table|/emojis|/charts|/shapes]` — the kit's
`package.json` `exports` is the one list of its entry points, and the test loader resolves
`@widgetarium/*` through it. Every tool runs from the repo root. A second host (web, Tauri) is another
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
measured in real Chrome by `tools/tree-test.ts` against the viewport, and the design goes in a note
of its own. `is-page` stays a separate thing: `mode: expanded` changes the board's padding, a screen
only claims height, and conflating them moved every drag measurement in the tree gate.

**A widget is a created component and two declarations, in TypeScript only, and it knows interfaces,
never implementations.** `const Name = createWidget({ inject: {...}, draw })` — `inject` the gateway
interfaces it reads, omitted when none — then `export const metadata = defineMetadata(Name, {...})`
for everything a person reads, `export const layout = defineLayout({...})` for `role`, `size`,
`inline` and `view`, and `export default Name`; `export const migrations = defineMigrations([...])`
when a tile cannot follow a change alone. The old `createWidget(props, draw)` throws. Props live in
`inject` and nowhere else: code outside `draw` takes their types from the widget, `PropsOf<typeof
Name>`. `defineProps` is gone.
All of it lives in `packages/core/src/gateway/declared.ts`. Each `define*` returns what it was given,
typed and checked on its own line; `createWidget` builds the component that reads and caches
(`define*` returns its input, `create*` builds something new). `manifestOfModule` turns the module
into the one manifest shape the engine reads, and `tools/props-test.ts` pins what every shipped
widget resolves to. A `widget.jsx` or `widget.js` is refused with the command that renames it. The
target is written down in https://claude.ai/artifact/RxMVaSunPzhiHGjTESozqT.

```tsx
const EntrySchema = VaultRecordSchema.extend({
	title: z.string(),
	done: z.boolean().optional().meta({ aka: ["complete"] }),
});

const Checklist = createWidget({
	inject: {
		getHeading: IQuery.expects(z.string().default("To do")),
		getEntries: IQuery.expects(z.array(EntrySchema)),
		createEntry: ICommand.sends(EntrySchema.extend({ id: z.uuid() })),
		updateEntry: ICommand.sends(EntrySchema.partial().extend({ ref: RecordRefSchema })),
		host: IHost,
	},
	draw: ({ getHeading: heading, getEntries, createEntry, updateEntry }) => { ... },
});

type ChecklistProps = PropsOf<typeof Checklist>;

export const metadata = defineMetadata(Checklist, { ... });
export default Checklist;
```

**Every gateway is an abstract class under `IBaseGateway`, named `I*Gateway`; an implementation is a
class named `*Gateway` that extends one.** `IValueGateway`, `IListGateway`, `ICrudGateway` and any
interface extending them inherit `IBaseGateway.of`; `createWidget` refuses a class outside the root
and refuses an implementation where an interface belongs. `.of(schema)` types every verb from one
zod schema; `.of({ read, create, update, other })` types each verb from its own, `other` standing for
every verb not named. Without `.of` an interface is untyped (`unknown`) — there is no generic form.
The compiler holds an implementation's reads in its own class (`TS2515`) and its picked writes where it
is given to a prop (`Implementation<typeof declared>`). `ISlot.of`, `IMounts.of`, `IHost`,
`INavigator`, `IHere`, `IReader`, `IContent`, `ICatalogue`, `IFoldIntoGroup` and `IConfigureMounts` are
what the host hands over, and a widget gets one only by declaring it. A zod schema value is named
`*Schema` and its type carries no suffix; a record's address is `RecordRef`, one branded name.

**Values are checked where they cross, never in the widget.** The built-in gateways check what they
read against the widget's schema through `context.parse` (`gateway/parsed.ts`, `gateway/problems.ts`):
a record that does not fit is left out and reported to the settings window's red "!" beside the
prop, and `useData` carries no `refused`. A value that does not fit is reported the same way and
drawn as the default, so a widget never receives what its schema refuses and keeps no fallback of its
own; a fixed set of choices is `z.enum([...]).default(...)`, whose values are the options
(`optionsOf` in `gateway/written.ts` refuses metadata `options` naming other values). `createWidget` wraps whatever it is given — an engine gateway, any class
extending an interface, or a plain value or array (`packages/core/src/declared-widget.ts`) — and a
`create` or `update` the schema refuses rejects before it reaches the implementation. A value picked
only `"get"` arrives as the value, `{ value, update }` when it picked `"get", "update"`. After any write it handed out the runtime
re-reads that gateway; `subscribe` is optional and only means "read again".

**`.pick(...)` is the widget asking, `allow` is the person answering.** Without `.pick` a gateway has
every method of its interface; with it, only the ones named, reads included. A verb not picked does not exist on the gateway **at compile time** (`entries.remove`
is `TS2339`). A picked `create`, `update` or `remove` brings `createMany`, `updateMany` or
`removeMany`, and `create` with `update` brings `upsert` (`packages/core/src/gateway/many.ts`): each
answers `{ done, failed }`, and an implementation that has its own is used instead.

**Still to build: an implementation holds every piece of logic.** A selection has left the
declaration: `.of()` takes no options for a value, and the widget's metadata names where the prop
starts from — `props.<name>.source = { implementation, fields }`, `@core/selection` for which row is
chosen and `@core/selected-row` for the row a sibling picks, resolved by `SelectionQuery` and
`SelectedRowQuery` in `packages/packs/core`; `fields` name sibling props by
their prop name. Every built-in source is a pack class built `new Class(fields, ports)` and holds
its own logic — the picking in `packages/packs/core`, file and folder reading in
`packages/packs/obsidian`, the statistics in `packages/packs/stats` — while core holds only the
contract: `QueryPorts` in `packages/core/src/engine/packs.ts` (`prop`, `kept`, `screen`, `notes`
beside the ports a command gets), built by `queryPortsOf`, and one resolver path in
`engine/host-gateways.ts`. A catalogue preview resolves its picked props through the same path. What still sits in declarations is `wants` and a declared list `where`/`sort`; they
leave for gateway implementations the packs offer per prop (`FolderQuery`,
`TypedValueQuery`, `ScreenStateQuery`), each registered with `defineGatewayMetadata` and the fields
the settings window draws from its constructor's schema. `keep: "screen"` is said in `defineMetadata`
(`props.<name>.keep`), never in `.of()`; without it the value is kept in the tile. A widget then draws states and formats
values; it never picks a row, falls back to the first, maps fields or filters by another widget. A
relation is the target's id, written by the widget that creates the record.

**`describes` in metadata is what the schema could not say.** One object keyed by the row's fields, holding the
label a person reads and the `type` the engine matches fields by. The `aka` a vault note may use for
a field lives in the schema, `done: z.number().optional().meta({ aka: ["kept"] })`, maps the field
only when the record has no field of its own name, and is merged into `describes` by the manifest
build (`packages/core/src/gateway/written.ts`); `describes` naming `aka` throws. A prop's own `aka`,
the names the prop had, stays in metadata. It replaced both `item.fields` and `needs`, which described the same row twice.
Four readers, each drawing a **different** conclusion from it, and no two of them ever compute the
same answer: `describedFields` and `needsOf` in `packages/core/src/gateway/props.ts` — the field list the settings
window draws, and the fields that take part in matching a note's properties — `inputsOfProp` in
`packages/core/src/reading.ts`, which counts them to classify the prop's reading, and `typesIn` in
`apps/obsidian/src/ai/find-command.ts`, which collects their types to rank a search. The line between the first
two is `aka`: **a field takes part in matching a note's properties exactly when it
names other names.** Without `aka` the widget reads the field under its own name, and `describes`
only tells the settings window how to draw it.

**A row is the record, and `ref` is its address.** `Row<T> = T & { ref }` — there is no `{ ref, value }`
wrapper, so a widget writes `entry.title`, keys by `entry.ref`, and `useData` answers with `data`
alone: an array for a list, the value for a value, `total` beside it. `ref` in a row type must be
typed `RecordRef` or left out, and `createWidget` and `defineMetadata` refuse a described or defaulted `ref` outright.
`rowOf` and `valueIn` in `packages/core/src/gateway/create.ts` are the only places an address is put on or taken
off. A list of primitives is the one exception and keeps `{ value, ref }`, because a string has
nowhere else to hold itself.

The engine resolves each prop to a gateway from the binding the person chose — a vault folder or
file, a value kept in the tile, or another tile's ref. Widgets read through `useData(gateway.list)`
and write through verbs; every verb is asked through `can()`. The manifest carries no id, no version
and no api: the id is the folder, the version is the commit, the api is stamped by the build.
**A surface is written by whoever places the node, and nothing lays one for you.** `main.js` no
longer hands `normalizeBoard` a `roleOf`, so `withDefaultSurfaces` in `packages/core/src/surface-default.ts` does
not run on a drawn board: it survives behind that switch, with `tools/surface-default-test.ts` as
its only caller. Measured before the switch was thrown, by `tools/surface-probe.ts` over three real
screens: the writer wrote `apart` on navigation columns and **nothing else**, because `wantsWriting`
requires `isBox(node)` and a tile is a leaf; `surfaceVerdicts` meanwhile advised `group` on every one
of those tiles. Two paths, disagreeing, neither reproducing the reference design — which is why the
agent now decides. `tools/surface-shapes.ts` holds the other half of the finding: a box takes a
plate only when it has sibling boxes, because `decideVerdict()` refuses a box that stands alone in its
parent. **The agent gives every node its surface as it places it**, guided by `docs/ai/surfaces.md`;
`widgets.mjs surfaces` reads a **drawn** board back and says which plates look wrong beside each
other, and is never a source of surfaces to write.

**A screen starts from a base, and the board remembers which one.** `packages/core/src/layouts.ts` holds the
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
different screen every time. `packages/core/src/patterns.ts` is now only the card shapes — what a card wears alone
and among peers — which is a different question from how a page is cut.

**The agent sees the whole catalogue, not the vault.** `widgets.mjs find` merges what is installed
with what every configured source offers, and `packages/core/src/engine/registry-file.ts` is the one reader of a
registry — a source naming a `path` on this machine is read off disk, one naming a `repository` is
fetched, and both come back through `readRegistry`, which is what turns a registry's `scope` and a
row's `name` into an id. An offered row carries its folder, so it is ranked by the role and the
fields its own manifest declares rather than sitting at zero, and `widgets.mjs install <id>` writes
it and its scope's shared files into the vault and records the install in the lock, leaving the build
to the engine. Everything the plugin still owns is the remote fetch. A vault whose catalogue
answers with only what it already holds is what makes an agent write a widget that exists.

`manifestOf` in `packages/core/src/engine/catalogue-index.ts` is the one place a declaration becomes the manifest
the engine reads.

**A widget folder is typed wherever it stands.** The repo has `registry/tsconfig.json`, so an editor
opening a widget resolves `widgetarium` instead of reporting `TS2307` and handing every prop `any` —
`packages/core/tsconfig.json` covers only the gateway's TypeScript. The vault gets the same: `layAgentFiles` lays
`.widgetarium/widgets/tsconfig.json` and `types/` beside the widgets, built by `tools/widget-types.mts`
from the gateway's emitted declarations, so a widget written in a vault is typed by the same manifest
the engine reads. `npm run test:vault-types` lays them into a temp folder and compiles a widget
against them.

**`manifest.generated.json` is the catalogue's card, and it is written, never authored.** `npm run
manifest` runs every widget's code and writes `cardOf(manifest)` beside it, and refuses to write a
card for a widget whose manifest the engine would refuse. A
catalogue that has not run a widget's code reads the card; a vault that has reads the code. An
install runs the code and refuses a card that says something the code does not.
`tools/widget-props.json` pins every shipped widget's resolved props — regenerate it with `node
--import ./tools/loader/register.mts tools/widget-props.ts` when a prop change is intended.

**A list never hands over everything.** `pageOf` caps an unasked read at `PAGE_UNASKED` — a hundred
rows — so a widget that draws what it read draws a hundred at most and a vault of a thousand notes
cannot take the frame with it. A widget that needs more says how many and thereby says why: an
aggregate names its own ceiling in its source, where a reader can see it. **Anything that draws rows
paginates**, and the paging is there from the first row rather than appearing at the thousandth;
`total` comes back beside `rows` so a widget knows what it did not get.

**A widget is checked by the plugin, not by the person who wrote it.** `checkWidget` in
`packages/core/src/widget-check.ts` reads a widget's own source, sheet and card and names six things a generated
widget gets wrong: a colour written by hand instead of a `--wg-kit-*` token, type written by hand
instead of taken from the host, rows drawn from a list read with no limit, a manifest naming no
role, a name imported from `widgetarium` that its surface does not carry — the one defect that
crashes a widget the moment it draws and that nothing else catches until it does — and an `h1` or
`h2` drawn inside a widget whose role is not `text`, which is a region title written into the plate
instead of standing beside it as markdown. It ships inside the
plugin and runs as `widgets.mjs check <id>`, exiting 1 while anything is
wrong — the agent's own gate, not a repository one. `tools/lint-code.mts` stays what it was: this
project's utility over every `src` and `registry`, and it knows nothing about colours.

**A default is a value kept in the tile, never a path. This is a security law, not a style one.**
A default is static data the widget ships with: strings, numbers, booleans, arrays, plain objects.
Nothing in it may name a file or a folder.

The reason is what a path in a default would buy an author. A widget whose default points at the
vault is reading a person's notes **before they have chosen anything** — and a widget declaring a
destructive verb could then delete files on first render, with no binding made, no consent given and
nothing to undo. The person names the path in the settings window, and only then does the widget
touch anything. That order is the whole protection, and a default naming a path removes it.

The manifest is refused: `carriesKey` in `packages/core/src/gateway/manifest.ts` walks a default to any depth
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
do whatever the widget declared. `allowedVerbs` in `packages/core/src/gateway/props.ts` decides, and a cut verb answers
`can() === { can: false, reason }`.

**A tile names the version it was made with.** `widget: "@scope/name@<commit>"` for a widget installed
from a repository, a bare id for one that lives in the vault; `widgetKeyOf` in
`packages/core/src/engine/widget-ref.ts` is what every comparison of widget ids goes through. An update is compared
with what is installed by `packages/core/src/engine/compatibility.ts`: a compatible one replaces the files in place
and the generation absorbs its commit; one that breaks tiles — a removed or reshaped prop, a changed
default, a rename without `aka` — installs beside it as `@scope/name@<commit>`. A tile moves to a
newer generation only by a press, through the widget's `migrations` when one covers the old props. A
note naming a commit the vault lacks offers to install that version.

## The laws that cost the most to learn

**A record's identity is an id, not its name.** Full decision in `docs/decisions.md`. A UUID in
frontmatter under a namespaced key, exposed as `record.id`; stored references use it, names are
labels. **Assigned only on an explicit action, never on render** — a gateway that writes while being
drawn litters the vault. Everything must work for records with no id yet: resolve id first, name or
path second. Duplicate ids come from **copies**, not from generation; the survivor is the one whose
path sorts first, detection is on read, and the re-mint is a write, so it waits for one.

**There are no settings. Every prop is a gateway, primitives included.** A list of named things —
tabs, views, columns, boards — is an `IListGateway` or `ICrudGateway`. A single thing is an `IValueGateway`, and the
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

**A setting is never read as a prop.** `tile.settings` is not consulted for any prop. A binding is
`{ implementation, fields, allow }` and nothing else, typed values included: `@core/typed-value` keeps
`fields.value`, `@core/typed-rows` keeps `fields.rows`, and `typedIn` and `withTyped` in
`packages/core/src/gateway/props.ts` are the one place that knows which field a prop's data lives
under. A prop with no binding reads what `implementationOf` there derives from its declaration.

**One law, three storages.** Where a list can live in more than one place, the verbs — add, rename,
archive, reorder, delete — are written **once** over rows, and each storage supplies only
`read()` / `write(rows)`. Two code paths for one operation is the disease that produced `views`
meaning three different things, slot versus mount, and archived columns living in two places.

**A board is a record, and its columns are a field of it.** A widget that draws a board declares one
prop — `{ "kind": "value", "source": { "implementation": "@core/selected-row", "fields": { "rows":
"<the collection>", "picked": "<the selection prop>" } } }` — and the engine resolves it to the **row**
that selection names, not to a field of that row. Archived is a
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
(pixels or `"full"`) and `size.preferredHeight` (pixels or `"auto"`) — `defineLayout` refuses one
without — and may add `keepsRatio` and `at`, steps keyed by the width of the **region** it stands in
(`regionPx` from `layRegion`), never the screen, switching at once like a `max-width` query.
`preferredSizeAt` in `packages/core/src/tree.ts` picks the size for a region and `preferredSizeStyle` in
`packages/core/src/surface.ts` draws it: the width as the cell's `max-inline-size`, the height as its `min-height`
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
kit; `WidgetRoot` survives only as a bare element for widgets written before. **A name leaves the
widget API only when no widget anywhere uses it — the repo's `registry/` is not all of them:** a
person's own vault widgets import from `widgetarium` too. Removing `WidgetRoot` because the registry
no longer used it crashed `@you/habit-list` in a real vault on 2026-10-01.

**The tile's plate is the node's, the plates under it are the widget's, and one component paints
both kinds.** `Card` in `packages/kit/src/components/card.tsx` (once `Surface`, which stays as an alias for widgets published
before the rename) takes `type` — `group` by default, `none` for a widget that paints nothing — plus `tone` for a plate in a state and `side`/`across` for
a divider. It reads `PLATES_ABOVE` (`packages/kit/src/utils/surface.ts`), seeded from the laid node's own `plates` and
`underSurface` — **inside the tree handed to the tile's shell, because a widget is drawn in its own
render root** (`DrawnInShell` in `packages/core/src/mounted.ts`) and no context crosses that seam. Measured: a Provider
around the cell body left every widget counting from zero, and the third plate painted itself white
on a drawn board while every jsdom check stayed green. Every plate under it provides the next level,
so a widget's Surface is judged by the very laws the tree is judged by: `plateRefusal` in `packages/core/src/surface-roles.ts`
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
**An `indicators` region lays a `group` on every widget in it** that names no surface — `wearInRegion`
in `packages/core/src/tree.ts`, at lay time, never written to the note — except a `text`, `layout`, `control` or
`navigation` widget and one already standing on a plate. The only CSS that decides the colour is `[data-surface="group"] [data-surface="group"]`. `object`, a plate lifted with a
hairline, was a second plate nobody placed and is gone; `item` was a fourth name. Both are read once
at `normalizeBoard` through `SURFACE_WAS` beside `fill`, `outline`, `raise` and `divider` as a
`group`, then never written again. A
slot wears one too: the manifest's `slots.<name>.surface` is the default, a tile's `slots.<name>.surface`
the pick, and `withSlotSurface` wraps every item the slot draws in that plate, so the widget in a slot
draws no background either — a kanban's `task-card` lies in the `group` its manifest names, raised
because the column under it is a group already. A prop the
parent does not feed a slotted widget arrives as a gateway over its declared default (`slotDefaults`),
and a list is read a page at a time with `{ offset, limit }` (`pageOf`), which is how `@default/feed` loads
ten more each time its end comes into view. A widget names its
`role` in its manifest, a group names `role` and `purpose` on its box, and the role bounds how far it
may be set apart. The nesting table in `packages/core/src/surface-roles.ts` is absolute: an `outline` is only ever
the first plate from the region, a `fill` inside a `fill` is one step darker because the token is
translucent, and a `divider` stands anywhere; a plate whose every child wears a plate is an error.
The laws in `docs/ai/surfaces.md` are run by `packages/core/src/surface-laws.ts` over what `packages/core/src/surface-measure.ts`
read off the drawn board — never by eye, and when in doubt, none. **The laws the tree alone can
answer — N, 5 and N2 — are a gate, not advice**: `wearSurfaceAt` decides and writes in one call, so a
surface the laws refuse cannot be written at all, and the Design tab draws the refused ones disabled
with the law that refused them. Everything the drawn board decides stays advice from
`widgets.mjs surfaces`.

**Spacing is read off the tree, never written.** A region is a child of the root; a box's children
stand 24px apart in a region, 16px one box down, 8px deeper, one step closer after a `text` widget and
between repeats of one widget, and a `swap` adds no level. Each step is what the eye sees, never under
8px: between two plates one plate's padding is taken off, so cards stand close at every level; from a
plate to bare content the step is drawn in full; a bare widget is measured from its first content, the
empty edge `packages/core/src/content-insets.ts` finds inside it taken off. So grouping is the only decision, and a box of its parent's direction with no
surface and no heading is a phantom `lint` names. A `pad` in a note is read and dropped. A host may shrink every step at once with `--wg-gap-scale`; the catalogue sidebar sets `0.5`, measured against its canvas by `npm run test:catalogue-paint`. Corners are
never written either: every plate is rounded concentric with the one around it, re-laid on every
change. `packages/core/src/board-lint.ts`,
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
`collapse` out of the row (`layRowWithout`), or leaves its parent whole when it carries one itself.
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
`toggle: adaptive` box has one only while collapsed. `apps/obsidian/src/header-actions.ts` places them with `view.addAction`
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

**The catalogue is a board of widgets in the sidebar, and every pick is a request.** The catalogue
and the docs are two `ItemView`s drawing boards of `@catalogue` widgets, and all their logic is the
`@catalogue` pack's queries and commands. **Each board is a widgetarium block in the very format a
note holds, shipped inside the plugin** (`apps/obsidian/boards/catalogue.md`, `docs.md`) and read by
`catalogue-boards.ts`: never written to the vault, never editable, so a plugin update is what changes
the sidebar. The old catalogue dialog (`packages/core/src/catalogue-dialog.ts` and its parts) is kept
but hidden: nothing opens it. A box's add press, a slot, a view and a substitution each ask
`CATALOGUE_REQUESTS` (`packages/core/src/engine/catalogue-requests.ts`), which reveals the sidebar and
answers the pick; a dialog that asked steps aside until it is answered. A card is carried onto a board
or into a note by `ICarrier`: every board registers a drop receiver
(`packages/core/src/surface/drop-receivers.ts`), and a drop on markdown writes a new board block under
the line. A widget placed before it is installed stands at once and draws the install ring, read from
the one owner of install progress, `INSTALL_JOBS`.

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
`packages/core/src/prop-visibility.ts` is the one place that answers it, asked by the props group, the slot rows and
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
`<tileId>/<propName>`; the board holds one registry of them (`packages/core/src/gateway/refs.ts`) and a where row
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
raising each are in `docs/decisions.md`; they live in `packages/core/src/version.ts`.

**The build is the engine's, and it runs on the person's machine.** A widget folder holds only what
its author wrote — `widget.tsx`, the entry, and any sibling `.ts`/`.tsx` modules it imports
relatively, nested folders included (`compileWidgetFolder` in `packages/core/src/engine/widget-build.ts`
makes them one program, and every one is a build input); everything the engine makes lands in `build/` beside it — `widget.js` from the TSX,
`widget.css` when the sheet asked to be compiled — and a vault wears the built sheet in place of the
author's. `tools/publish.ts` is the author's check that it all builds, not the thing that builds it.
What is built is a fact of its own: `lock.builds[id]` names the source, the compiler and a hash per
input, separately from `lock.widgets[id]`, which only means installed from a repository. After the
first draw and at every widget-folder change the engine asks each folder whether the files its build
was made from are still the files on disk, and rebuilds the ones that answer no — which is why an edit
in a symlinked scope shows with no install. `node --import ./tools/loader/register.mts tools/build-vault.ts` runs that same pass from the
terminal.

**A start reads no widget file.** An iCloud vault on a full disk evicts `.widgetarium/`, and every
read waited ~1.7 s for a download: 655 reads, ten minutes of an empty screen. The plugin now mounts
from a snapshot kept on this machine in IndexedDB (`packages/core/src/startup-snapshot.ts`, the store
in `apps/obsidian/src/startup-snapshot-store.ts`), never in the vault: what `readVault` read, the
packages, the plugin stamp, and each file's `mtime:size` taken **before** it was read. A snapshot zod
refuses is ignored and the vault is read; one from another plugin build mounts like any other, because
it holds raw files and the fingerprint lists with the running build's own `listVault` — refusing it
sent the first start after every install back to iCloud, 11 to 50 s measured. Laid files follow the
same rule: `types/` and `@catalogue` carry a `.laid-by-plugin` mark with the bundle hash, so an
unchanged lay is one read, not 433 downloads queued in front of the note being opened, and a changed
one writes without reading first, removing each file before writing it, because writing over an
evicted file downloads it first (35 ms against minutes, measured). Only a folder named `@…` is a scope
(`isScopeFolder`): `types/` was walked as one, and iCloud's `x.d 2.ts` conflict copies passed as widget
modules, six minutes of queued reads after every start. After the first draw the plugin
lists and stats every file — metadata only, no download — and reloads, rebuilds and rewrites the
snapshot only when something differs; the build pass is skipped while the snapshot says it ran clean
over these exact files. Every `registry.load()` rewrites the snapshot through `onLoaded`.
`npm run test:startup-snapshot` measures it.

**Tailwind is asked for in CSS and answered at build time.** A `widget.css` opening with
`@import "tailwindcss"` is compiled by the real `tailwindcss` package, fetched into the vault's module
space like any other dependency and never loaded to draw anything. The theme is CSS too — `@theme`
over `--wg-kit-*`, in the widget's sheet or in a scope file it imports — so the configuration lives
outside the widget. Preflight is never imported: it restyles the host's own elements, and a sheet that
asks for it is refused by name. A widget whose styling needs this declares `api: 2`.

**The kit's tokens are one Tailwind theme, served by the plugin.** `packages/kit/theme.css` maps every
`--wg-kit-*` token onto Tailwind's namespaces — `--color-group`, `--text-sm`, `--radius-plate`,
`--spacing-cards` — and `serveToTailwind` answers `@import "widgetarium/theme.css"` with it, so a
widget writes `bg-group rounded-plate text-sm` and repeats no variable. It is served out of the
plugin's own bundle, never fetched, and any other name under `widgetarium/` is refused by the same
function that refuses preflight. **The mapping is `@theme inline`.** A plain `@theme` declares
`--color-group: var(--wg-kit-group-fill)` on `:root`, and CSS resolves that `var()` where it is declared —
but the kit's tokens live on `.wg-root` and `.wg-portal`, not `:root`, so every kit colour came out
transparent (measured in Chrome: `rgba(0, 0, 0, 0)` plain, the token's colour inline). Inline writes
`var(--wg-kit-group-fill)` into the utility itself, still a live variable a theme can repaint. The kit's own
stylesheet reads the same tokens directly, and its four text sizes — `--wg-kit-text-xs|s|m|l`, 11px
and the host's three UI steps — are what both sides now name: the five hand-written sizes that
answered to nothing, three 11px and one 9px among them, are on the scale.

## Next tasks

Remind the person of this list at the end of every finished task, until each is done.

- [Only reviewed commits reach a vault](.tasks/approved-commits/artifacts/task.md) — until a curator
  list of approved commit hashes exists, every commit a registry serves installs unreviewed.
- [Widget code cannot reach past its gateways](.tasks/widget-code-scanner/artifacts/task.md) — kit
  APIs for window events and portals, then a scanner refusing `window`, `document` and
  `ownerDocument` in widget source.
- [Widgets know interfaces, implementations hold the logic](https://claude.ai/artifact/RxMVaSunPzhiHGjTESozqT)
  — `I*` gateway interfaces, `defineGatewayImplementation`, the settings window's implementation
  picker, the widgets off declared `where`/`sort` and `wants`, schemas renamed `*Schema`.

## Verification

**Falsification is the rule: a check that cannot be broken on purpose proves nothing.** For every
check, mutate the source to violate the law it claims, confirm it goes red, restore with a
uniqueness-asserted targeted edit, verify by md5. If a check turns out unfalsifiable, delete it —
along with whatever depends on it — rather than ship it.

**Tests import the real sources; nothing is copied.** Every `node tools/…` script in `package.json`
runs under `node --single-threaded --import ./tools/loader/register.mts`, an in-memory loader that compiles `.ts`,
`.tsx` and `.jsx` with esbuild exactly as `apps/obsidian/build.mts` does (`h`/`Fragment`, the
nearest `tsconfig.json`, `es2020`), resolves extensionless and `.js` specifiers to the `.ts` behind
them and `@widgetarium/*` through each package's `exports`, reads `.md` and `.css` as text, answers
`obsidian` with `tools/loader/obsidian-stub.mts` and the `widgetarium:*` specifiers the build
provides. A test imports `../packages/core/src/<file>`; an edit shows in the next run with no
rebuild, and suites run side by side. A tool run by hand needs the same two flags.
`--single-threaded` is not optional: under eight suites at once, Node 25 deadlocks in `process.exit()`
when a background Sparkplug or Maglev compile job waits for a GC the exiting main thread never runs —
measured 11 of 240 runs hung without it, 0 of 240 with it, and the flag only works on the command
line (set at runtime through `v8.setFlagsFromString` it changed nothing, and `NODE_OPTIONS` refuses it).

`npm run test:paint` drives real headless Chrome and reads **resolved** computed values; the jsdom
suites resolve no cascade and lay nothing out, so a CSS claim proved only there is not proved.
`test:dialog`, `test:view` and `test:tree` are timing-flaky — re-run alone before blaming a change.

## The design direction: Material 3 Expressive and Apple

**Two references, one job each.** Google's Material 3 Expressive and Apple's current system are what
this plugin is measured against. Neither is copied as a look — a Material component dropped into an
Obsidian plugin fights the host's theme and loses. What is taken is the practice, and the practice is
the same on both sides: **maximalist, physical, answering.**

- **Shape carries the accent, not only colour.** An element earns attention by having a form the ones
  around it do not. The 35 outlines in `packages/kit/assets/shapes/` are the vocabulary; `node tools/fetch-shapes.mts`
  regenerates them. One unusual form per widget, on the thing the eye is looking for.
- **An emoji is a drawing, not a character.** A typed emoji renders as whatever font the host has;
  `<Emoji name="smiling-face-with-halo"/>` from `widgetarium/kit/emojis` renders the same everywhere.
  The 129 Microsoft Fluent faces are the vocabulary — the Unicode group "Smileys & Emotion" up to the
  monkeys, and nothing else. `node tools/fetch-emojis.mts` regenerates `packages/kit/src/emojis/emoji-table.ts`; the
  licence sits in `packages/kit/assets/emojis/`. They cost 300kb of the bundle, so they hang off their own
  specifier and no widget pays for them unless it asks.
- **An icon is a name the kit resolves, never an import.** `<Icon name="anchor"/>` from
  `widgetarium/kit` draws the kit's own 35 glyphs first and the whole of Lucide behind them — one
  name, one drawing, and a kit glyph wins a name Lucide also holds. `node tools/fetch-icons.mts`
  regenerates `packages/kit/src/icons/icon-table.ts` from `lucide-static`; the licence sits in `packages/kit/assets/icons/`. Lucide
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

**The engine is copied, the widgets are symlinked — except where they are not.** `apps/obsidian/install.mts` copies
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
- **A name says what the code does.** Four rules:
  1. A function that returns a changed copy or builds something is an imperative verb phrase:
     `archiveColumn(column)`, `prune(node)`, `columnsToWrite(columns)` when it only prepares a write.
  2. A past participle or an `is*` name is a fact about data that already exists: `isInstalled`,
     `surfacesWritten(layout)`. A component naming a drawn state (`Collapsed`) is fine.
  3. A hook that performs an effect every render is named for what it does: `useWritesOwnSize`.
  4. One idiom per name: `manifestOfDeclared`, never `manifestOfWritten`.
     Idioms that stay: `xOf(y)` for a derivation read off `y`, `isX`/`hasX`, `refuseX` answering a reason
     or null, `withX(y)`, `useX`, `createX`, `defineX`, `*Gateway`/`I*Gateway`, `*Schema`.
- Migrations are **lazy**: reading accepts the old shape, writing emits the new one, and nothing bulk
  rewrites the vault. A prop's `was` carries every name it had. Until the first release this law is
  suspended for the manifest and tile shapes: boards written before are rebound by hand, and every
  version number (`api`, `v`, `registry`) is reset to 1 on the day of release.
