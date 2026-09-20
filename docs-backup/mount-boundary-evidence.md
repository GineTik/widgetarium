# Mount boundary — evidence

The `file:line` map behind the plan **Межа монтування: вкладений віджет отримує власне дерево**.
Pinned to `feat/device-layouts`, lines read 2026-09-11. Line numbers rot — re-read before trusting one.

## What the change touches

| Fact                                                                                  | Where                                                                                                       |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `MountEntry.render` is built here                                                     | `src/surface.js:147` — `render: drawable ? () => h(MountedWidget, { ...mount, key: row.name, ... }) : null` |
| `drawable` predicate                                                                  | `src/surface.js:136`                                                                                        |
| Its twin, forty lines above                                                           | `src/surface.js:95` — `if (!child?.component \|\| child.error)` in `resolveSlots`                           |
| The child re-enters the engine here                                                   | `src/surface.js:114` — `MountedWidget` → `WidgetHost`                                                       |
| Tile boundary — every widget is in the engine's tree                                  | `src/surface.js:429`, `src/surface.js:902` — `h(Boundary, { key: tile.widget }, drawn)`                     |
| `Boundary` that swallows a child crash today                                          | `src/surface.js:65-82`                                                                                      |
| Roots are keyed by node — what makes a redraw idempotent                              | `src/engine/render.js:4-10`                                                                                 |
| `drop` deletes synchronously, unmounts in a microtask                                 | `src/engine/render.js:12-17`, `:33`                                                                         |
| `leaseFor` — the one owner of a node's root, and `src/portal.js:1` its first consumer | `src/engine/render.js:44`                                                                                   |
| The draw/dispose pair `leaseFor` absorbed                                             | `src/portal.js:16-24`                                                                                       |
| `refs.put` during render, `refs.drop` in cleanup                                      | `src/surface.js:290`, `:304-309`                                                                            |
| `drop` guarded by identity                                                            | `src/gateway/refs.ts:72-79`                                                                                 |
| The only read-decide-write over a gateway list                                        | `src/gateway/refs.ts:352-364` — `pickedWrites` gates on `list().total > 0`                                  |
| Fallback readers write nothing                                                        | `src/gateway/refs.ts:300-309`, `:339-347`                                                                   |
| FLIP records left/top only                                                            | `src/flip.js:24-33`                                                                                         |
| `restingRef` seeded in `useLayoutEffect`                                              | `src/surface.js:662-669`                                                                                    |
| Overlay rule — the direct-descendant chain                                            | `styles.css:871-874`                                                                                        |
| The clip it fights                                                                    | `styles.css:718` — `.wg-widget-root { overflow: hidden }`                                                   |
| A nested root the weaker selector would un-clip                                       | `widgets/@default/task-card/widget.tsx:276`                                                                 |
| Popover that sets `data-wg-overlay`                                                   | `src/kit.js:866`                                                                                            |

## Consumers of `MountEntry.render`

| Where                                        | What it does                                                          |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `widgets/@default/view-group/widget.tsx:142` | `active.render ? active.render() : <Missing/>`                        |
| `widgets/@default/view-group/widget.tsx:143` | `if (!isStriped && active.render) return body` — the unstriped branch |
| `tools/interact-test.mjs:785`                | exact key set of `MountEntry`, `render` included                      |
| `tools/interact-test.mjs:806`                | `check("with nothing to draw", gone.holds[0].render, null)`           |

No other file reads it. `grep -rn "\.render\b" widgets tools src` on 2026-09-11.

## Versions

| Fact                                                                                         | Where                                                          |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `WIDGET_API = 1`, `MIN_WIDGET_API = 1`                                                       | `src/version.js:2-3`                                           |
| Refusal is `api > WIDGET_API` or `api < MIN_WIDGET_API`                                      | `src/version.js:33-35`                                         |
| Raise `WIDGET_API` when the contract gains; raise `MIN` only when something promised is gone | `docs/versioning.md:50-58`                                     |
| 15 manifests, every one `"api": 1`                                                           | `grep -h '"api"' widgets/*/*/manifest.json \| sort \| uniq -c` |
| Exactly one declares `mounts`                                                                | `widgets/@default/view-group/manifest.json`                    |

## What is NOT at risk

| Claim                                          | Basis                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| React context does not cross the seam today    | `AppearanceOverride` (`src/widget-root.js:68`) is the only provider of `Override`, and no widget imports it |
| Appearance hooks have no widget caller         | `useWidgetRounded` / `useBackgroundType` — only `tools/expand-test.mjs:46,70` and `tools/fill-shim.js:4-6`  |
| Dialogs are unaffected                         | `src/dialog.js:213,226` anchor on `document.body` through `mountInto` — their own root already              |
| The settings window does not read `MountEntry` | `src/settings-window.js:1363-1365` builds its own `WidgetHost`                                              |
| No `StrictMode` anywhere                       | `grep -rn StrictMode src tools widgets` — zero                                                              |

## Gates

| Gate                                                             | Runner                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `test:view`                                                      | headless Chrome, `--virtual-time-budget=9000` — `tools/harness.mjs:99,152-156`                          |
| `test:strip`, `test:interact`, `test:settings`, `test:template`  | jsdom                                                                                                   |
| `test:paint`                                                     | headless Chrome, resolved computed values                                                               |
| `MOUNT_PROBE` today                                              | `tools/paint-test.mjs:258-306` — stub `Leaf` components on a legacy `layouts:` board; reads no geometry |
| `test:surface` matches `export declare (const\|function) <name>` | `tools/api-surface-test.mjs:19`                                                                         |

## Startup cost the plan does not change

`npm run perf`, 2026-09-11: prod bundle 1 037 097 B, parse+compile 13 ms; sucrase over 17 widget
modules (158 kB) 28 ms, one pass on the startup path. Bundle composition, esbuild metafile:
emoji-table 303 kB, `src` 223 kB, sucrase 180 kB, react-dom 176 kB, other 121 kB, react 8 kB.
