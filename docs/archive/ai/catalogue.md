# The catalogue tool

The plugin installs a small Node script into the vault. It is how you see what widgets exist without
reading the whole vault or guessing.

```bash
node .widgetarium/bin/widgets.mjs find --limit 20
```

It prints JSON by default, because you are the one reading it. Add `--text` when you want to paste a
line to the person.

## list

```bash
node .widgetarium/bin/widgets.mjs find --about "kanban board columns" --limit 10
node .widgetarium/bin/widgets.mjs find --tag chart --source offered
node .widgetarium/bin/widgets.mjs find --pack @core --text
node .widgetarium/bin/widgets.mjs find --offset 20 --limit 20
```

| Option                                 | Means                                                              |
| -------------------------------------- | ------------------------------------------------------------------ |
| `--search <words>`                     | Every word must appear in the id, title, description or keywords   |
| `--tag <keyword>`                      | Exactly this keyword                                               |
| `--pack <@pack>`                       | Only this pack                                                     |
| `--source installed \| offered \| all` | What is in the vault, what a source offers, or both. Default `all` |
| `--offset <n>`                         | Skip this many. Default `0`                                        |
| `--limit <n>`                          | At most this many, 1 to 100. Default `20`                          |
| `--text`                               | A readable table instead of JSON                                   |

The answer carries `total`, so page with `--offset` rather than asking for everything.

`installed: true` means the widget is in this vault and a board can name it right now. `installed:
false` means a source offers it and it has to be installed first.

## show

```bash
node .widgetarium/bin/widgets.mjs show @default/metric-total
```

The full manifest, the files the folder holds, and where it is. Read this before you bind a tile's
props — the manifest is what says which props exist, which are collections and which are values.

## source

```bash
node .widgetarium/bin/widgets.mjs source @default/metric-total
```

The component source. Read it when you are writing a widget of your own and want to see how a real
one declares its props, reads its gateways and answers a narrow tile.

## packs and sources

```bash
node .widgetarium/bin/widgets.mjs packs
node .widgetarium/bin/widgets.mjs sources
```

`packs` is the shape of the catalogue at a glance. `sources` is where offers come from — the repositories
this vault reads registries out of.

## Installing a widget

A widget marked `installed: false` is offered by a source and is not in the vault yet. Take it:

```bash
widgets.mjs install @default/obsidian-markdown-preview
```

It writes the widget's files and its scope's shared files into `.widgetarium/widgets/`, records the
install in `widgets.lock.json`, and leaves the compiling to the engine, which builds a folder whose
files no longer match its build. It refuses a widget already installed and one no source serves.

A source this machine cannot read from disk — a registry on GitHub — is still the plugin's to fetch,
because that runs somebody's code in the plugin's own realm against a resolved commit. For those,
tell the person: **open the catalogue (`Widgetarium: Browse widgets` in the command palette) and press
Add on the widget.**

A widget the person wrote, or one you wrote into `.widgetarium/widgets/`, needs no install at all —
the folder is read as it is written.

## When nothing fits

Say so, in one line, and write one. [widget.md](widget.md) is how. Do not stretch a widget into a job
it was not made for because it was the nearest card in the list.
