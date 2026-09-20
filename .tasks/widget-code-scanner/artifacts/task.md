# Widget code cannot reach past its gateways

`TASK` · 2026-09-17 · owner: unassigned · repo: widgetarium

## TL;DR

Widget code runs through `new Function` inside the Obsidian window (`src/engine/compiled-module.js`), so it can reach `window`, `document` and through them Node — files, processes, other plugins. A verb switched off on a tile stops a bug, never a malicious widget. First give widgets kit APIs for what they legitimately use these for, then refuse the tokens in source.

## Measured (2026-09-16, widget sources, not builds)

| token | where |
|---|---|
| `window` | `@rank/tier-list`, `@default/metric-total`, `@inline/code-block`, `@task/kanban-board`, `@default/lib.js` |
| `document` | `@rank/tier-list` |
| `ownerDocument`, `defaultView` | `@task/kanban-board` |

Legitimate uses are pointer drags that listen on the whole window and portals onto the page body.

## Steps

1. Kit APIs: window-wide pointer and key events, a portal target, timers.
2. Move the widgets above onto them.
3. A scanner shared by the build and the install: `window`, `globalThis`, `document`, `ownerDocument`, `defaultView`, `process`, `require`, `eval`, `Function`, dynamic `import`, obfuscated or minified source. Warn first, refuse once step 2 is done. It reads sources only: `build/widget.js` carries `require` everywhere.

## Out of reach of a scanner

A scanner never proves absence. Real isolation is a sandbox — Figma runs plugin logic in QuickJS compiled to WebAssembly and the UI in an iframe — which is its own research.
