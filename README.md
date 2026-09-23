# Widgetarium

Build working screens out of your own notes. A board of widget tiles lives inside a note, every widget reads and writes real vault data, and an assistant can lay out a whole screen for you.

## What it does

- **Boards in a note.** A ` ```widgetarium ` block holds a board: a tree of rows and columns with a widget in every leaf. Regions collapse into drawers and sheets on narrow panes instead of breaking.
- **Widgets bound to your data.** A widget declares what it needs — a list of tasks, a number, a selection — and you bind each need to a vault folder, a file, a value kept in the tile, or another tile. A widget writes only through the verbs you switch on.
- **A catalogue.** Widgets install from registries into `.widgetarium/widgets` in the vault, pinned to the commit they came from. Updates that would break a tile install beside the old version instead of over it.
- **Substitutions.** Rules that draw a widget in place of a line of text in reading mode.
- **An assistant.** A sidebar agent that designs a screen, picks or writes the widgets for it and places them on a board.

## Repository

An npm-workspaces monorepo. Dependencies point one way: the app uses core, core uses the kit, the kit uses only React.

| Folder                           | What it is                                                                | Licence      |
| -------------------------------- | ------------------------------------------------------------------------- | ------------ |
| [`apps/obsidian`](apps/obsidian) | The Obsidian plugin: mounts core in a note and gives it the vault         | FSL-1.1-ALv2 |
| [`packages/core`](packages/core) | The board engine: layout tree, widget build and install, gateways, render | FSL-1.1-ALv2 |
| [`packages/kit`](packages/kit)   | The component kit every widget and screen is drawn with                   | MIT          |
| [`packages/sdk`](packages/sdk)   | The types a widget is written against                                     | FSL-1.1-ALv2 |
| [`registry`](registry)           | The widget library: `@default`, `@flow`, `@media`                         | MIT          |
| `tools`                          | Tests, generators and repository checks                                   | FSL-1.1-ALv2 |
| `docs`                           | The assistant's handbook (`docs/ai`), design decisions, catalogue guides  | FSL-1.1-ALv2 |

## Develop

```bash
npm install
```

```bash
npm run dev
```

`dev` builds the plugin with a sourcemap and copies it into the vault; `npm run install-vault` does the same with a production build. The vault defaults to the author's; point elsewhere with `WG_VAULT=/path/to/vault`. After an install, reload the plugin in Obsidian with the command **Widgetarium: Reload plugin**.

```bash
npm test
```

`npm test` runs every gate in turn; each one is also its own script (`npm run test:tree`, `npm run test:kit`, …). The paint and tree gates drive a real headless Chrome. `npm run lint` checks that everything is written in English and holds the house code rules.

Every command runs from the repository root.

## Write a widget

A widget is a folder with a `widget.tsx` that describes itself and draws itself:

```tsx
import { createWidget, defineManifest, defineProp } from "widgetarium";

type Entry = { title: string; done?: boolean };

export const manifest = defineManifest({
	title: "Checklist",
	description: "The entries still to do, ticked off where they stand.",
	role: "collection",
	size: { preferredWidth: 320, preferredHeight: "auto" },
	props: {
		heading: defineProp<string>()({ default: "To do" }),
		entries: defineProp<Entry[]>()({ default: [], writes: ["create", "update"] }),
	},
});

export default createWidget(manifest, ({ heading, entries }) => {
	// read with useData(entries.list), write with entries.update(...)
});
```

The engine compiles it in the vault; nothing is built ahead of time. [Add your own widget](docs/catalogue/add-your-own-widget.md) and [publish it](docs/catalogue/publish-your-widget.md) walk through the rest.

## License

Two licences, one per folder. [LICENSE](LICENSE) is the map.

| Folder           | Licence                               |
| ---------------- | ------------------------------------- |
| `packages/kit/`  | [MIT](packages/kit/LICENSE)           |
| `registry/`      | [MIT](registry/LICENSE)               |
| `packages/core/` | [FSL-1.1-ALv2](packages/core/LICENSE) |
| `packages/sdk/`  | [FSL-1.1-ALv2](packages/sdk/LICENSE)  |
| `apps/obsidian/` | [FSL-1.1-ALv2](apps/obsidian/LICENSE) |

The kit and the widgets are MIT so they can be copied into any project, including a commercial one. The FSL folders may be used, changed and shared for any purpose except a Competing Use: offering them, or something substantially similar built from them, as a commercial product or service. Each version becomes Apache 2.0 two years after its release. To build a competing product, contact the author for a commercial license.
