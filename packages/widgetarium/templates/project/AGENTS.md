# {name}

A Widgetarium app: Vite, React, TypeScript, Tailwind and zod. Every page is a board of widgets.

## Where everything lives

`widgetarium.json` names every layer. In this project:

| Layer                                                   | Folder                               |
| ------------------------------------------------------- | ------------------------------------ |
| routes, one `board.json` per route                      | `{paths.routes}`                     |
| widgets, one folder holding `widget.tsx` each           | `{paths.widgets}`                    |
| a feature's queries and commands                        | `{paths.logic}`                      |
| zod schemas widgets and handlers share                  | `{paths.schemas}`                    |
| ready generic handlers: folders, notes, statistics, git | `{paths.sources}`                    |
| the kit, copied in and yours to change                  | `{paths.kit}`                        |
| third-party code the project keeps                      | `{paths.libs}`                       |
| the spec, the design and the references                 | `{paths.docs}`, `{paths.references}` |
| the handbook                                            | `{handbook}`                         |

`@widgetarium/kit` and `widgetarium/kit` resolve to `{paths.kit}`, so the engine draws with this copy.

## Imports point down only

app → widgets → logic → shared. A widget never imports a handler and a handler never imports a
widget; both import the schema in `{paths.schemas}`.

## The contract

1. A widget is `createWidget({ inject, draw })` with `defineMetadata` and `defineLayout`, in TypeScript only: [widget.md]({handbook}/widget.md).
2. A widget declares gateway interfaces (`IQuery`, `ICommand`, `I*Gateway`), never implementations; the rules live in handlers under `{paths.logic}`.
3. Values are checked by zod where they cross a gateway, never inside a widget.
4. A board is a tree of boxes and tiles, and every node carries its surface: [board.md]({handbook}/board.md), [surfaces.md]({handbook}/surfaces.md), [examples.md]({handbook}/examples.md).
5. Everything drawn comes from the kit and every colour from its tokens: [kit.md]({handbook}/kit.md), [design-system.md]({handbook}/design-system.md).

A command written `node {tool} …` in the handbook belongs to the Obsidian plugin and does not run here.

## Catalogue code is a starting point

1. Find it: `npx widgetarium catalogue search <words>`, then `catalogue show <id>` for its props and commands.
2. `npx widgetarium add <id>`, with `--as <name>` when the name is taken; it lands in `{paths.widgets}` and is yours, never updated.
3. Move its schema into `{paths.schemas}`, or map this project's records to it in a feature handler under `{paths.logic}`.
4. `npm run typecheck && npm run check`.

## Code style

- Strict TypeScript: no `any`, no casts, no `!`; data from outside arrives `unknown` and is narrowed by zod.
- Early returns over nesting.
- Comments only with the prefixes `TODO:` and `TRADE-OFF:`.
- kebab-case file names and named exports; a widget's `export default` is the one exception.
- zod at every border, and a zod schema is named `*Schema`.

## Commands

- `npm run dev`: the app on a local server.
- `npm run typecheck`: TypeScript over `src` and `vite.config.ts`.
- `npm run check`: `widgetarium check`, every layer against `widgetarium.json`; exits 1 on findings.
- `npx widgetarium catalogue list | search <words> | show <id>`: the widgets the registries offer.
- `npx widgetarium add <id> [--as <name>]`: copies one into `{paths.widgets}`.
- `npx widgetarium check`: what `npm run check` runs.

After every change run `npm run typecheck && npm run check`.
