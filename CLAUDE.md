# Widgetarium

An Obsidian plugin: widget tiles in a nested layout inside a note, plus rules that substitute a
widget for a line of text. `src/` is React with `h()` hyperscript — **no JSX there**; the gateway layer under
`src/gateway/` is TypeScript (`tsc --noEmit` gates it), the rest of `src/` is untyped JS that dies
in place rather than being typed. Widgets under `widgets/` are `.tsx` compiled at runtime by
sucrase (types stripped, never checked — the contract holds through `can()` and the engine, not tsc).

**Every widget prop is a gateway.** A widget declares `props` in the second argument of
`createWidget`, beside the component that reads them (`kind: "collection" | "value"`, `verbs` with
`required`/`optional`); the engine resolves each to a `CollectionGateway`/`ValueGateway` from the
binding the person chose — a vault folder or file, or a hardcoded value in the tile. Widgets read
through `useData(gateway.list)` and write through verbs (`update({ ref, data })` — the ref names
which, the adapter knows what it means); a verb nothing provides exists with `can() === {can:false,
reason}`. Contract in `src/gateway/contract.ts`; a manifest that still carries `props` is still read
and still answered, and old `sources` manifests still resolve via `was`/legacy fallback, per the
lazy-migration law.

**`manifest.json` is the catalogue's card, not the widget's declaration.** It carries what the engine
must know *before* it runs any code: `id`, `title`, `description`, `keywords`, `preview`, the sizing
(`defaultSize`, `maxSize`, `collapseBelowPx`, `stackBelowPx`, `tallestPx`), `inline`, `slots`,
`mounts`, `api`, `was`, `view`. A folder holding nothing but `widget.tsx` installs and draws; the
record is derived at publish by `tools/publish.mjs`, which reads the imports for `dependencies` and
the `createWidget` declaration for `props`. `tools/widget-props.json` pins every shipped widget's
resolved props, so losing an `aka` or a `wasSetting` in a move goes red by name — regenerate it with
`node tools/widget-props.mjs` when a prop change is intended.

## The laws that cost the most to learn

**A record's identity is an id, not its name.** Full decision in `docs/record-identity.md`. A UUID in
frontmatter under a namespaced key, exposed as `record.id`; stored references use it, names are
labels. **Assigned only on an explicit action, never on render** — a gateway that writes while being
drawn litters the vault. Everything must work for records with no id yet: resolve id first, name or
path second. Duplicate ids come from **copies**, not from generation; the survivor is the one whose
path sorts first, detection is on read, and the re-mint is a write, so it waits for one.

**There are no settings. Every prop is a gateway, primitives included.** A list of named things —
tabs, views, columns, boards — is a `CollectionGateway`. A single thing is a `ValueGateway`, and when
what it holds is a primitive the manifest names the type: `{ "kind": "value", "type": "number" }`,
and `text` and `boolean` alike. The type is what the settings window draws the control from — a
switch for a boolean, a plain field for a number or a text, JSON for anything else — and it is what
lets a number typed into the tile be re-bound to another widget without touching the widget that
reads it. `here` is a solo gateway with `get`/`update` and deliberately no `list` and no filters,
because a solo thing needs no collection surface.

**A value kept in the tile answers in the tick it is asked.** A gateway whose handlers touch no I/O
declares `settlesNow`, and the cache settles it on the first read rather than a microtask later.
Without it every number read through `useData` is `isLoading` on its first frame, and a number that
lives in the tile itself blinks on every mount.

**A setting a note still carries is read, never guessed at.** A prop that replaced one declares
`wasSetting: true`, and only then does the engine read `tile.settings` for it; a prop that never was
a setting ignores a stray key of the same name, which is what stops a folder binding being hijacked
by yesterday's text. Where the old setting was a comma list and the prop is a collection, the prop
also declares `rowsFromText: "<field>"`. Writing always emits the prop, and drops the setting key in
the same write.

**One law, three storages.** Where a list can live in more than one place, the verbs — add, rename,
archive, reorder, delete — are written **once** over rows, and each storage supplies only
`read()` / `write(rows)`. Two code paths for one operation is the disease that produced `views`
meaning three different things, slot versus mount, and archived columns living in two places.

**A board is a record, and its columns are a field of it.** A widget that draws a board declares one
prop — `{ "kind": "value", "picks": "<the selection prop>", "of": "<the collection>" }` — and the
engine resolves it to the **row** that selection names, not to a field of that row. Archived is a
field of the column (`archivedAt`), never a second list and never a map keyed by board name. A board
with no note of its own answers from the tile, which is where `wasSettings` carries the props that
used to hold those lists. There is no `board` bus and no `configureBoard`: the only board-wide
command left is `foldIntoGroup`, because folding tiles into a group is an action, not data.

**The grid is gone, and a board is one recursive tree.** `layout:` is a **node**, and a node is one
of two things: a **leaf** — a tile, `{ id, ratio, height }` — or a **box** — `{ dir: "row" | "column",
of: [...] }` carrying the same `ratio` and `height` plus `width`, `keep`, `foldable`, `folded` and
`scroll`. A box nests to any depth, which is the whole point: `[[A], [B, [C over D]]]` is
expressible, and the three named regions were not able to say it. Full decision in
`docs/board-tree.md`.

**Behaviour lives on a property, never on a name.** The root is a row of three boxes and the middle
one carries `keep: true`, the two beside it `foldable: true` — that is all `left`, `main` and `right`
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

**A region that cannot stand leaves the note and covers the whole app.** `columnsOf` answers where
every child of the **root** is, and it answers in four words: `beside`, `floating`, `hidden`,
`alone`, each naming an index. A box nested deeper never floats — it stacks, because a drawer over
the window has no place inside another box. Below
`MAIN_FLOOR_PX` a sidebar is never a row under the main one — it becomes a drawer on the layer the
dialog already owns: a portal into `document.body`, `fixed` over the whole Obsidian window, the same
`--wg-overlay-scrim`, `--wg-kit-raise` with an edge and no cast shadow, growing from the point that
was pressed. Its widgets stay mounted while it is shut, because refs live only while the widget is on
the tree. **Whether a floating region is open is a fact about this screen, not about the note**: it
lives in the board's own state, `folded:` keeps governing only the docked case, and a resize that
gives the region its place back never writes anything.

**There is no line between regions.** The board is drawn inside a note, under Obsidian's own chrome,
so a border between two root boxes has neither a top nor a bottom to reach — it dies in the middle
of the page. The gutter is the boundary, and it is `REGION_GAP_PX` wide.

**A box exists because it is declared, not because it holds something.** An empty `foldable` box is a
real region: it draws as a zone, a carried tile can be dropped into it, and the pointer is answered
across the whole column rather than only where its widgets reach. This is what lets a board be filled
at all — a sidebar that appears only once something is in it can never receive the first thing. A new
board is born with all three, and all three stand in reading mode too, so the fold toggles, the edit
toggle and the page toggle are the board's own chrome and answer a press in either mode.

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
reach it. `@default` is such a copy today, made when the vault needed records carrying derived props.
Check before believing an edit landed:

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
  rewrites the vault. A manifest's `was` carries the old name — for a prop, a mount and a widget id
  alike; `wasSetting` carries the fact that the prop used to be a setting.
