# Widgetarium

An Obsidian plugin: widget tiles on a grid inside a note, plus rules that substitute a widget for a
line of text. `src/` is preact with `h()` hyperscript — **no JSX and no TypeScript there**; widgets
under `widgets/` are `.jsx` compiled at runtime by sucrase.

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

**A fed slot cannot be entered; an unfed one can.** A slot whose manifest declares `gives` gets its
inputs from the parent and owns nothing. Without `gives` the child owns its own sources and settings.
`docs/view-group.md` carries this; it replaced an earlier split between "slot" and "mount".

**Declared is not rendered.** Six rounds shipped with every gate green and were rejected on sight.
`WidgetHost` (`src/surface.js`) is the only component that re-renders when the context bus changes —
a value sliced by the selection must be computed **inside it**. One level up gives a correct declared
value and a stale screen.

**A markdown post-processor is reading mode only.** Live Preview is a different engine and needs a
CodeMirror 6 editor extension. Reading view also caches rendered sections and unloads off-screen ones.
Sources, quotes and the ranked causes are in `docs/research/post-processors-and-live-preview.md`.

## Verification

**Falsification is the rule: a check that cannot be broken on purpose proves nothing.** For every
check, mutate the source to violate the law it claims, confirm it goes red, restore with a
uniqueness-asserted targeted edit, verify by md5. If a check turns out unfalsifiable, delete it —
along with whatever depends on it — rather than ship it.

`npm run test:paint` drives real headless Chrome and reads **resolved** computed values; the jsdom
suites resolve no cascade and lay nothing out, so a CSS claim proved only there is not proved.
`test:dialog`, `test:view` and `test:drag` are timing-flaky — re-run alone before blaming a change.

## House rules

- All colours from `--wg-kit-*` tokens; no hardcoded colours. The kit's controls paint fill and corner
  on a `::before` — the element itself is `border-radius: 0` by design.
- Comments only with the prefixes `TODO:`, `TRADE-OFF:`, `CONTEXT:`, fewest possible words. A
  pre-edit hook blocks anything else.
- Every string is English; `npm run lint:lang` must pass. Never build a sentence by concatenation —
  author the whole sentence with a placeholder.
- Early returns over nesting; no proxy variables; every new entity needs a consumer.
- Migrations are **lazy**: reading accepts the old shape, writing emits the new one, and nothing bulk
  rewrites the vault. A manifest's `was` carries the old name — for a setting, a mount and a widget id
  alike.
