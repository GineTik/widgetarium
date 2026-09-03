# A gateway's record type is its contract

`TASK` · 2026-09-02 · owner: unassigned · repo: widgetarium · design: `docs/typed-needs.md`

## TL;DR

A widget declares the shape it needs as the record type its gateway carries; the engine resolves
each need against the folder's own fields and asks about only what it cannot resolve. Today no
widget declares anything: all 21 are `.tsx`, none holds a type, and `tsc` never looks at them.

## What is true today

| fact | evidence |
|---|---|
| 21 widgets, all `.tsx`, none `.jsx` | `ls widgets/*/*/widget.tsx` |
| zero `type` / `interface` declarations across all of them | `grep` over `widgets/` |
| zero `import type` | same |
| 17 of 21 annotate props as `: any`; the other 4 annotate nothing | `grep -c ": any"` |
| `tsconfig.json` includes only `src/**/*.ts`, so `npm run test:types` never sees `widgets/` | `tsconfig.json` |
| the `widgetarium` module is `src/api.js`, plain JS with no type surface | `src/api.js:50` |
| sucrase strips and checks nothing | `src/registry.js:19,22` |

So the extension is TypeScript and nothing else is. `: any` is not a type — it is the annotation
that switches checking off. Nothing has to be migrated away; this is an introduction, not a rewrite.

## Order of work

### 1 · Make types possible before making them required — `DONE`

- `src/gateway/needs.ts` — the whole widget-author vocabulary: `Aka`, `Day`, `Text`, `Color`, the
  five engine markers, `DefaultVerbs` and `ResolvedOps`
- `src/gateway/contract.ts` — `Patch`, and `CollectionGateway<T, Wanted>` resolving through
  `ResolvedOps`; `CollectionGateway<T>` still means all five verbs, which is why nothing in `src/`
  changed
- `tools/api-surface-test.mjs` + `npm run test:surface` — the declaration and `src/api.js` must
  export the same names
- `widgets/types/widgetarium.d.ts` — the module a widget imports, reached through `paths`
- `tsconfig.widgets.json` + `npm run test:needs`, in `npm test`
- `tools/type-gate/needs-gate.ts` — the falsifiable gate

**`skipLibCheck` must stay off in this project.** The first attempt declared the module as
`declare module "widgetarium"` with relative re-exports, which TS rejects — and `skipLibCheck: true`
swallowed the rejection, so `CollectionGateway` silently resolved to `any` and the gate passed while
proving nothing. Both mutations below were run against that version and stayed green.

Falsified, each restored and checked by md5:

| mutation | verdict |
|---|---|
| `Aka<N> = { broken: N }` — the alias stops being transparent | RED |
| `SuppliedAction` stops requiring the key to match the marker's name | RED |
| a name renamed in the declaration but not in `src/api.js` | RED |

**A drift the review caught and the type had been carrying for a while:** `DuplicateIdReport`
declared `keeper`, while `src/record-id.js:35` writes `keeps` and `src/record-id.js:53` reads it.
`record-id.js` is plain JS, so `tsc` never saw the disagreement. The type now says `keeps`, and
`npm run test:surface` exists so the next name to drift is caught by a run rather than by a reader.

**`widgets/**/*.tsx` is deliberately not in `include` yet.** Turning it on today reports 136 errors
across the 21 widgets that were never checked — mostly `useState([])` inferring `never[]`. Each
widget joins the include as it is migrated to declared needs, per the lazy-migration law. `strict`
is on, `noImplicitAny` is off until then.

### 2 · `Aka` and the record type

```ts
type Habit = {
	days: Day[] & Aka<"entries" | "dates" | "log" | "checkins">;
	title?: Text & Aka<"name">;
	color?: Color;
	goal?: number;
};

export default createWidget(function HabitGrid({ habits }: { habits: CollectionGateway<Habit, Accesses> }) {
	const { rows } = useData(habits.list);
});
```

`Aka<Names extends string> = unknown`, so `Day[] & Aka<…>` **is** `Day[]` to the checker and at
runtime. A property is a need, `?` makes it optional, the type is what the field picker filters by.

`Accesses` fills the `Ops` slot `CollectionGateway` already has in `src/gateway/contract.ts`, and it
carries one fact per verb beyond its input and output: whether a binding that cannot do it may still
host this widget. That is the same fact `?` already carries for a need, so it is written the same
way and gains no vocabulary:

```ts
type Accesses = {
	list: ListAction;
	update: UpdateAction;
	remove?: RemoveAction;
	archive?: Action<Ref, void>;
};
```

`ListAction` … `RemoveAction` name the engine's own verbs and take their signature from `T`, so the
author never writes `Query` or `Patch<Habit>` by hand. A verb beyond the standard five is declared
as the `Action<I, O>` the gateway already speaks — no second word for the same thing.

Without `?` the verb must be available or the widget does not mount there — `unmetVerbs` in
`src/gateway/props.js` already refuses that at runtime, with the reason. With `?` the widget is
mounted anyway and reaches the verb through its `can()`, drawing without the control when the answer
is false.

One rule twice: `?` means the widget survives without it.

### 3 · The build reads the type

Settled in `docs/typed-widgets.md`: types are erased by every transpiler, so the manifest stays the
runtime fact and stops being written by hand. `widgetarium build` reads the record type and the
`Accesses` type and emits `needs` and `verbs`.

**Decided: one `typescript@5` devDependency, for both `tsc --noEmit` and the manifest reader.**
`typescript@7.0.2` is what is installed today and it publishes its API only under
`typescript/unstable/*` (verified in `node_modules/typescript/package.json` `exports`) — a release
build that reads types through an API its vendor labels unstable breaks on a patch bump. TS 5's
compiler API is the stable one every codegen tool already uses. What is lost is the native port's
speed on a `tsc --noEmit` that takes seconds here; if that ever matters, alias-install both and let
7 do the checking while 5 does the reading.

No widget file changes for this. A build-only dependency is a devDependency the build script
imports; widget sources never see it.

### 4 · Resolution — `DONE`

`src/gateway/resolve-needs.ts`, proved by `npm run test:mapping` (`tools/needs-test.mjs`).
`fieldsOf` now reports `holds` (a list's element type), `seen` (every type observed) and `many`
beside the `type` the filter UI already read.

Three rules the tests forced out, none of them in the original design:

| what was wrong | what it is now |
|---|---|
| a name match ignored the type, so a valueless `entries` hijacked the alias and mapped to nulls | a name that cannot hold what is needed is not an answer |
| one property answered every need of its type — a lone `name` was taken by `title` and `colour` at once | a property answers at most one need; the rest become the question |
| a need for many refused a field holding one, and a list with one junk value | both are taken, and coercion drops what will not convert |

Falsified, each restored and checked by md5: a property answering several needs at once, a write
going back under the need's name, and a field reporting one type instead of every type seen — all RED.

### 5 · `mappedCollection` — `DONE`

`src/gateway/mapped.ts`, chained in `resolveGateway` (`src/surface.js`) as
`folderGateway → mappedCollection → narrowedByRefs`, and applied to catalogue preview rows in
`src/preview.js` so a card does not go blank on a migrated widget. `describe` is now a verb on the
folder gateway, so the map is resolved from the host's field report rather than a second read.

Stored answers: `src/shapes.js`, per folder path in plugin data, moved by `app.vault.on("rename")`
in `src/main.js`. `@habit/grid` is migrated and is the first widget under `tsc`.

### What review caught that the tests did not

**A write naming an unresolved need vanished in silence.** `renamedPatch` put the key at the top
level, `updateOnSlot` reads only `data.props`, and `src/host.js:271` skips `processFrontMatter` when
`patch.props` is empty — then returns the record, so the widget saw success. Reproduced by mutation:
`{"data":{"colour":"red"}}` reached the folder unwrapped. It is now a refusal naming the need, which
is what `docs/typed-widgets.md` demands of a write that did not happen.

**A condition on an unresolved need narrowed the list to nothing.** Such a clause is now dropped —
`docs/prop-bindings.md` already says an unresolved condition narrows nothing rather than matching
nothing.

**Date/number/boolean detection lived twice**, regex included. `fields.ts` owns it; `mapped.ts`
calls it.

**Write-only entities removed**: `fieldsAnswering`, `unansweredIn`, `choose`/`withChoice` and the
`onResolved` hook had no reader, because their reader is the unbuilt `Reading` block. They return
with it.

**Renamed**: `holds` → `elementType`, `seen` → `typesSeen`, `Entry` → `VaultRecord` (the repo
already has `CacheEntry` and `MountEntry`), `readFolder` → `readShape`, `makesOne` → `createsOne`,
`oneValue` → `coercedOne`, `byName`/`byType` → `resolvedByName`/`resolvedByType`.

**Declined, and why**: the resolution memo lives in a closure, so a property renamed while a board is
open is picked up only on the next mount. Moving that invalidation into `gatewayCache` changes who
owns a cache and is its own piece of work; it stands as a named `TRADE-OFF` over
`rememberedResolution` rather than a half-fix.

Six mutations across this task, each RED and restored by md5. `npm test` green end to end.

### What is left

- **Step 6, the `Reading` block and the in-tile question, is not built.** The resolution reports its
  unanswered needs and the store can write a choice, but there is no screen on which a person makes
  one — so an unresolved required need draws an empty widget instead of a dropdown. This is the
  largest remaining piece and the one that gives mapping a manual mode at all.
- **Seven of eight `@habit/*` widgets still carry `settings.field`.** The pattern is `@habit/grid`'s,
  repeated.
- `@habit/lib` and `widgetarium/kit` remain `any` behind a `TODO`.

### How the ladder is written



`fieldsOf()` in `src/gateway/fields.ts` already reports `{ prop, type, values }` off the records.
Add Obsidian's own registry beside it — `.obsidian/types.json` through `app.metadataTypeManager`.

| step | rule |
|---|---|
| 1 | exact name |
| 2 | `was` — the need's previous name in an older release of this widget |
| 3 | `Aka`, then fuzzy over those names |
| 4 | the sole field of the required type — **exactly one, never a best guess** |
| 5 | otherwise unresolved: ask, once |

Steps 1–4 are silent and never written down. Only an answer to 5 is stored, per folder:
`shapes["Habits"] = { days: "entries" }`. A tile may override its own reading.

**The key is the folder path, followed on rename.** The gateway's own `id` cannot serve: it is
`folder:${path}?${stableKey(baked)}` (`src/gateway/obsidian.js`), so two widgets reading one folder
with different baked queries carry different ids and would answer the same question twice. There is
no id on a folder to borrow either — `docs/record-identity.md` gives one to a record, not to a
directory, and minting one would mean writing into the person's vault to draw a tile. So: path as
the key, and `app.vault.on("rename")` moves it. That listener is already registered in
`src/host.js:233` for the folder slot's own events; a folder rename arrives on it.

Two candidates at step 4 is not ambiguity to resolve — it is step 5.

### 5 · `mappedCollection`

`mappedCollection(base, map)` renames on read and un-renames on write, the same shape as
`narrowedCollection` in `src/gateway/narrow.ts`. Chain:
`folderGateway → mappedCollection → narrowedCollection`. A derived need is read-only and
`update.can()` says so with a reason.

### 6 · The `Reading` block and the in-tile question

In the settings window, between `Source · X` and `Where · X`, appearing only once a folder is
picked:

```
Reading · Tasks                                 3 of 4 found
  Title       ←  name                                  auto
  Due         ←  due-date                              auto
  Status      ←  status                                auto
  Done on     ←  [ pick a date property        ▾ ]   needed
```

Resolved rows dim, the unresolved one bright. Its dropdown holds only type-matching fields, each
with sample values, and offers to create the property when the folder has none. The same control is
the tile's empty state for a **required** unresolved need, so a person who never opens settings
still meets the question in place.

### 7 · Delete what it replaces

`settings.field` / `settings.prop` / `settings.pick` across `@habit/*`, `toHabit(row, field)` in
`widgets/@habit/grid/widget.tsx` and its equivalent in every widget, and `manifest.json` as a
written file. One pass with `was`, not eight — fewer states to test.

## Two shapes of the same thing

A habit tracker meets two vault layouts: one note per habit holding its days, and one note per day
listing the habits kept that day. **No rename turns one into the other**, so this is not the map's
job and no field-level mapper can do it.

It belongs one layer up, as a **reader** the person picks beside the folder:

```
Source · Habits
  Orbitask/Days
  Read as:  ( one note per habit )  ( one note per day, grouped by ▾ )
```

`pivotedCollection(base, { groupBy })` emits `Habit` rows out of day records and is still a
`CollectionGateway<Habit>`, so the widget never learns which reader it got. Writing back is
expressible for exactly this pivot — keeping a habit on a day edits that day's note — and
`create.can()` answers false. Everything outside it reports honestly rather than half-working.

A general user-written mapper is explicitly refused: `create` and `update` through arbitrary code is
not shippable to this audience, and the honest answer for a layout neither reader covers is that the
widget does not read it.

**The discriminant must exist in the stored format before release** even if only one reader ships;
adding it later is a migration.

## Done when

- `npm run test:types` covers `widgets/` and fails on a wrong need type, proved by breaking one.
- `@habit/grid` reads `habit.days` with no `field` setting anywhere, on a vault whose property is
  named `entries` and never answered a question.
- Renaming that property to something unrecognisable, while it is the only date list in the folder,
  changes nothing on screen.
- Adding a second date list makes the tile ask, once, and the answer serves every other habit widget
  bound to that folder.
