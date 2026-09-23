# @widgetarium/core

The board engine. It knows how a board is shaped, how a widget becomes code that runs, how a widget reaches its data, and how all of it is drawn. It knows nothing about Obsidian: a host hands it files and records, and any host — the Obsidian plugin, a web app, a desktop shell — can.

## What lives here

| Area                 | Files                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| The board            | `tree.js` (the layout tree and how it is laid), `model.js` (read and write a board), `layouts.js` (page skeletons), `board-lint.js`     |
| Surfaces and spacing | `surface-roles.js`, `surface-laws.js`, `surface-measure.js`, `content-insets.js`                                                        |
| Drawing              | `surface.js` (the board), `mounted.js`, `widget-root.js`, `settings-window.js`, `dialog.js`, `catalogue.js`                             |
| Widgets              | `engine/` — compile a widget's TSX, install from a registry, lock versions, check compatibility, search the catalogue                   |
| Data                 | `gateway/` — the typed gateways a widget reads and writes through, the manifest (`defineManifest`, `defineProp`) and refs between tiles |
| The widget surface   | `widget-api.js`, `api-core.js` — what a widget receives as `widgetarium` at run time                                                    |
| Checks               | `widget-check.js` — the defects a generated widget gets wrong                                                                           |

`gateway/` is TypeScript and typed by [`tsconfig.json`](tsconfig.json); the rest is plain JavaScript written with `h()` hyperscript, no JSX.

## Use

Import a file by its path:

```js
import { normalizeBoard } from "@widgetarium/core/model.js";
import { laid } from "@widgetarium/core/tree.js";
```

Core draws with [`@widgetarium/kit`](../kit) and never imports an app.

## Licence

[FSL-1.1-ALv2](LICENSE): free for any use except offering it, or something substantially similar built from it, as a competing commercial product or service. Each version becomes Apache 2.0 two years after its release.
