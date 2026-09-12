# Widget install — implementation plan

The decision this executes: **Установка віджета** — a widget is source plus a dependency list, the
vault holds a module space where several versions of one package stand side by side, and install
compiles once so startup compiles nothing. The reasoning, the prior art and the costs are in the
spec artifact; this file is the order of work.

Each stage lands on its own branch off `feat/device-layouts`, is green on `npm test` before the next
one starts, and carries at least one check that can be broken on purpose. **A check that cannot be
broken proves nothing** — mutate the source to violate the law it claims, confirm red, restore with a
uniqueness-asserted edit, verify by md5.

Stages 0–3 change no contract a widget author can see. Stage 4 onwards do.

---

## Stage 0 — one owner for a root, one owner for "drawable"

No behaviour change. Removes the two twins that every later stage would otherwise duplicate again.

| File | Change |
|---|---|
| `src/engine/render.js` | `leaseFor(node)` returning `draw` / `release` over the existing `roots` WeakMap; the release becomes a cancellable intent rather than a delete-now, unmount-later split; `drop` stays the one mutator that removes a root |
| `src/portal.js` | `mountInto` calls `leaseFor` instead of holding its own pair |
| `src/surface.js` | `isDrawable(definition)` used by both `mountEntry` and `resolveSlots` |

**Checks**

- `leaseFor` on the same node twice reuses one root — break by creating a root per call, the child's
  state resets.
- `release()` then `draw()` on the same live element does not leave the node blank — break by
  removing the identity check in the queued unmount.

---

## Stage 1 — the DOM boundary

Two widgets on different React majors cannot share a tree. This is the stage everything after it
stands on.

### 1a — mounts

Full plan in `docs/mount-boundary-evidence.md` and the mount-boundary spec. `MountEntry.render`
becomes `drawInto(element) => Release`; the child gets its own root and its own `Boundary`.

| File | Change |
|---|---|
| `widgets/types/widgetarium.d.ts` | `render` → `drawInto`; `export type Release`; `export declare const Mounted` |
| `src/surface.js` | `mountEntry` returns `drawInto` |
| `src/mounted.js` | new — the only place a React holder meets the boundary |
| `src/api.js` | `Mounted` in `core` |
| `widgets/@core/view-group/widget.tsx` | branch on `problem`, draw `<Mounted key={…}>` |
| `styles.css` | `.wg-mounted { display: contents }`; overlay rule narrowed to the root that contains the overlay |
| `tools/interact-test.mjs` | the `MountEntry` key set and the `holds[0].render` assertion |

### 1b — tiles

The tile's widget stops being a node in the board's tree. `TileView` hands the engine an element; the
settings window, which today takes the tile's widget as a React node, needs its own answer first —
**design that before writing 1b**, it is the one unknown in this stage.

**Checks**

- A widget that throws on render leaves the board and the tab strip standing — break by putting the
  child back in the holder's tree, the tile's `Boundary` eats the whole group.
- A tab change calls `Release` — break by dropping the `key` on `Mounted`.
- Child state survives an ordinary holder re-render — break by making `drawInto` non-idempotent.

---

## Stage 2 — the module space

| File | Change |
|---|---|
| `src/engine/modules.js` | new — fetch a package: facade → `x-esm-path` → write one file |
| `src/engine/widget-lock.js` | the lock grows `modules`: `name@version` → path, hash, which widgets point at it |
| `src/installer.js` | resolving a widget's dependencies is part of installing it |
| `src/registry.js` | `createRequire` stops being a whitelist and becomes a resolver over this widget's lock entry |

Fetch shape, verified 2026-09-11:

```
GET https://esm.sh/<name>@<version>?bundle&external=react,react-dom
  → facade re-exporting /<name>@<version>/X-…/es2022/<name>.bundle.mjs
  → that file, one request, imports only what was externalised
```

Two requests, one file written. No npm, no node, no bundler — this is what keeps mobile working.

**Checks**

- A widget importing a listed package renders — break by removing its lock entry, the widget refuses
  and names the package.
- An import nothing listed fails with the package name in the message, not a bare `undefined`.
- The same `name@version` wanted by two widgets is downloaded once — break by keying the lock on the
  widget instead of the package, the second install writes a second copy.
- A version nothing points at is collected — break by dropping the back-reference, the folder stays.

---

## Stage 3 — compile at install

| File | Change |
|---|---|
| `src/installer.js` | compile the widget's TSX once, store `widget.js` beside the source, record its hash |
| `src/registry.js` | load `widget.js`; compile source only when there is no build — that is the author's local folder path |
| `tools/perf-report.mjs` | the startup row must read zero passes for installed widgets |

**Checks**

- `npm run perf` reports no sucrase pass on the startup path — break by loading source first, the row
  comes back.
- Editing the source in an author folder still redraws without an install — break by preferring a
  stale `widget.js`, the edit stops showing.

---

## Stage 4 — React is a module like any other

The engine keeps its own React for its own chrome. A widget's `react` resolves from its lock entry.

| File | Change |
|---|---|
| `src/api-core.js` | new — the framework-free half, ONE instance: gateways, `gatewayCache`, refs, tab rows |
| `src/widget-api.js` | new — the per-React half, built as its own bundle with `react`, `react-dom` and `widgetarium/core` provided from outside; also owns `drawWidget`, the root a foreign React draws into |
| `src/api.js` | gone; `registry.js` composes the two halves into `widgetarium` |
| `build.mjs` | `surfaceOptions()` builds that second bundle and a plugin embeds its text under `widgetarium:surface` |
| `src/registry.js` | `react` resolves through the same table as everything else; a widget declaring one gets a scope of its own, and a package is run once per React |
| `src/mounted.js` | `drawnWidget` — the one place that decides whether a widget goes in the tree or into an element of its own; `surface.js`, `catalogue.js` and `inline-render.js` all call it |
| `src/crash-boundary.js` | new — the boundary as a factory over `h` and `Component`, because each React needs its own class |
| `src/fit.js` | `reactClash` — the one place that says a slot may not cross a React |

**Checks** — `npm run test:react`

- Two widgets on different React majors draw on one board — break by pointing both at one instance,
  one of them throws on a hook.
- `gatewayCache` is one object no matter how many React versions are loaded — break by moving the
  cache into the per-React surface, a write in one widget stops reaching the other.
- Filling a slot across a React is refused at the point of choosing, with both versions named. What
  the refusal compares is the INSTANCE, not the major: two instances of one version clash just as
  hard, and comparing versions is a check with another road to the same state.
- A widget declaring no React runs on the engine's — break by dropping the fallback, every installed
  widget goes with it.
- The surface asks `widgetarium/core` for nothing the core does not export, and the emoji drawings
  stay behind that boundary — the two ends of the one-core rule are written in two files, so a
  detector stands between them.

The widget-facing surface is 39 kB with React and the core provided, and 536 kB carrying its own —
that is what React leaving it is worth. The engine keeps its React for its own chrome, so the plugin
bundle does not shrink; it grows by the 39 kB the surface text costs.

---

## Stage 5 — the catalogue record replaces the manifest

| File | Change |
|---|---|
| `tools/publish.mjs` | new — read imports from the source, versions from the author's lock, `props` from `createWidget`; emit the catalogue record and `widget.css` |
| `src/engine/catalogue-index.js` | the record's shape |
| `src/installer.js` | install reads the record, not a manifest in the widget folder |
| `widgets/*/*/manifest.json` | shrink to what the card needs, per the lazy-migration law: reading still accepts the old shape |

**Checks**

- A widget folder holding only `widget.tsx` installs and draws.
- A widget whose manifest still carries `props` still draws, and the props come from the code.
- Publishing a widget that imports a package with no ESM build fails at publish, not at install.

---

## Stage 6 — the developer's CLI

`npx widgetarium add <name>`: copy the source into the project, install `dependencies` into the root,
pull `widgetDependencies` recursively, and **stop on a version conflict with the project**, naming
both sides. Resolving it is the developer's call, not ours.

**Checks**

- Adding into a project whose React is outside the widget's range stops and prints both ranges —
  break by installing anyway, the widget lands broken and silent.

---

## Not in this plan

- Our own package mirror. First iteration leans on esm.sh; a third party deciding whether a board
  opens is a second-iteration problem, and it is a real one.
- Arbitrary npm. Until there is a mirror and hashes, the catalogue serves a checked set.
- Slots across React majors. Refused by design — a slot draws per row, and a root per card is the
  cost. Revisit only with a measurement, never with a guess.
- `layouts:` and the rest of the legacy shapes. Untouched; lazy migration as before.
