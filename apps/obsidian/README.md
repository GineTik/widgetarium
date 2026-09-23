# @widgetarium/obsidian

The Obsidian plugin. It mounts [`@widgetarium/core`](../../packages/core) inside notes and gives it what only Obsidian has: the vault, the editor, the header and the sidebar.

## What lives here

| Path                          | Job                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `src/main.js`                 | Plugin entry: the ` ```widgetarium ` block, commands, the screen view          |
| `src/host.js`                 | The host core talks to: files, frontmatter, records, dialogs                   |
| `src/board-note.js`           | Reads and writes the board a note carries                                      |
| `src/header-actions.js`       | Edit-mode and collapsed-region buttons in the note's header                    |
| `src/inline-render.js`        | Draws a widget in place of a line of text in reading mode                      |
| `src/substitution*.js`        | The rules editor behind those inline widgets                                   |
| `src/ai/`                     | The assistant: sidebar chat, providers, and the `widgets.mjs` CLI it runs      |
| `manifest.json`, `styles.css` | What Obsidian loads, next to the built `main.js`                               |
| `build.mjs`, `install.mjs`    | Bundle with esbuild, then copy into `.obsidian/plugins/widgetarium` of a vault |

Anything that would also work on the web or in a desktop shell belongs in core, not here.

## Commands

| Command                    | What it does                                    |
| -------------------------- | ----------------------------------------------- |
| Create board               | A new note holding an empty board               |
| Create board from template | A new note from one of the shipped screens      |
| Insert board here          | A board block at the cursor                     |
| Toggle edit mode           | Switch the open board between using and editing |
| Browse widgets             | The catalogue of installed and offered widgets  |
| Edit substitutions         | The rules that draw widgets in place of text    |
| Open the assistant         | The sidebar agent that builds screens           |
| Configure AI providers     | Keys and models for the assistant               |
| Reload plugin              | Pick up a new build without restarting Obsidian |

## Build and install

From the repository root:

```bash
npm run dev
```

```bash
npm run install-vault
```

`dev` is a build with an inline sourcemap, `install-vault` a minified one; both copy `main.js`, `manifest.json` and `styles.css` into the vault set by `WG_VAULT`.

## Licence

[FSL-1.1-ALv2](LICENSE).
