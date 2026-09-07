# Widgetarium

An Obsidian plugin: widget tiles on a grid inside a note, plus rules that substitute a widget for a
line of text. `src/` is React with `h()` hyperscript — **no JSX there**; the gateway layer under
`src/gateway/` is TypeScript (`tsc --noEmit` gates it), the rest of `src/` is untyped JS that dies
in place rather than being typed. Widgets under `widgets/` are `.tsx` compiled at runtime by
sucrase (types stripped, never checked — the contract holds through `can()` and the engine, not tsc).

**Every widget prop is a gateway.** A widget declares `props` in its manifest (`kind:
"collection" | "value"`, `verbs` with `required`/`optional`); the engine resolves each to a
`CollectionGateway`/`ValueGateway` from the binding the person chose — a vault folder or file, or a
hardcoded value in the tile. Widgets read through `useData(gateway.list)` and write through verbs
(`update({ ref, data })` — the ref names which, the adapter knows what it means); a verb nothing
provides exists with `can() === {can:false, reason}`. Contract in `src/gateway/contract.ts`; old
`sources` manifests still resolve via `was`/legacy fallback, per the lazy-migration law.

## The laws that cost the most to learn

**A record's identity is an id, not its name.** Full decision in `docs/record-identity.md`. A UUID in
frontmatter under a namespaced key, exposed as `record.id`; stored references use it, names are
labels. **Assigned only on an explicit action, never on render** — a gateway that writes while being
drawn litters the vault. Everything must work for records with no id yet: resolve id first, name or
path second. Duplicate ids come from **copies**, not from generation; the survivor is the one whose
path sorts first, detection is on read, and the re-mint is a write, so it waits for one.

**A list of named things is a gateway; one value is a setting.** `here` is a solo gateway with
`get`/`update` and deliberately no `list` and no filters, because a solo thing needs no collection
surface. Tabs, views, columns and boards are gateways. A folder path, a toggle, a number are
settings.

**One law, three storages.** Where a list can live in more than one place, the verbs — add, rename,
archive, reorder, delete — are written **once** over rows, and each storage supplies only
`read()` / `write(rows)`. Two code paths for one operation is the disease that produced `views`
meaning three different things, slot versus mount, and archived columns living in two places.

**The grid is dead. A board is a tree.** A board's layout is `layout:` — three regions, `left`,
`main` and `right`, each holding rows of cells with a `ratio` and a `height`. The old `layouts:` map
of column counts to `{x, y, w, h}` places is **legacy**: no entrance may create one, no surface may
offer one, and nothing new may be built on it. It still renders, and only so that the boards written
before the move keep opening while they are being looked at — that is a development affordance, not a
feature, and a person using the plugin must never reach it. Everything that produces a board — the
create command, the insert command, the folder menu, a template, the catalogue — writes a tree.
Reading still accepts `layouts:`, per the lazy-migration law; writing never emits a new one.

**A region exists because it is declared, not because it holds something.** An empty `left` or
`right` is a real region: it draws as a zone and a carried tile can be dropped into it. This is what
lets a board be filled at all — a sidebar that appears only once something is in it can never receive
the first thing. A new board is born with all three.

**A fed slot cannot be entered; an unfed one can.** A slot whose manifest declares `gives` gets its
inputs from the parent and owns nothing. Without `gives` the child owns its own sources and settings.
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

## Verification

**Falsification is the rule: a check that cannot be broken on purpose proves nothing.** For every
check, mutate the source to violate the law it claims, confirm it goes red, restore with a
uniqueness-asserted targeted edit, verify by md5. If a check turns out unfalsifiable, delete it —
along with whatever depends on it — rather than ship it.

`npm run test:paint` drives real headless Chrome and reads **resolved** computed values; the jsdom
suites resolve no cascade and lay nothing out, so a CSS claim proved only there is not proved.
`test:dialog`, `test:view` and `test:drag` are timing-flaky — re-run alone before blaming a change.

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
  rewrites the vault. A manifest's `was` carries the old name — for a setting, a mount and a widget id
  alike.
