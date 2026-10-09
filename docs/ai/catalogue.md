# The catalogue

The catalogue is code to start from, never a dependency. A widget added from it becomes the
project's own: it is refactored to the project's schemas like anything written here, and no update
ever lands over it.

## Finding a widget

```bash
widgetarium catalogue search tasks by day
widgetarium catalogue list
widgetarium catalogue show @default/table
```

`search` ranks by the words in a widget's id, title, keywords and description and leaves out what
matches none. `show` prints the card: role, every prop with its kind, control, verbs, source and
fields, the commands, the slots, the files, the libs it imports and the npm packages it needs.
Every command takes `--json`, which is what an agent reads.

The registries read are, first to last: `--registry <folder or URL>`, then `catalogue.registries`
in `widgetarium.json`, then the repository's `registry/` when the CLI runs inside it.

```json
{ "name": "shop", "catalogue": { "registries": ["../widgetarium/registry"] } }
```

## Adding one

```bash
widgetarium add @default/table
widgetarium add @default/table --as order-table
```

It writes:

- the widget folder into `src/widgets/<name>/`; a name the project already holds is refused, and
  `--as` picks another;
- each lib of its scope that it imports into `src/shared/libs/<library>/`, once: an identical file
  is skipped, a file you changed is kept and said so. Its imports move onto the alias,
  `"@default/lib"` becoming `"@libs/default/lib"`;
- the npm packages its card declares into `package.json`, except what the engine hands every widget
  (`widgetarium`, the kit, `zod`), and never over a range already there;
- `origin.json` beside it: the id, the registry, the commit it came from (`local` when the registry
  folder has uncommitted changes or is no repository) and when.

A widget it draws in a slot is named in the output; add that one too.

## Then make it the project's

1. Move its schema into `src/shared/schemas`, or keep it and map the project's records to it in a
   handler under `src/logic/<feature>`.
2. Rename, cut and reshape it like code you wrote.
3. `npm run typecheck && npm run check`.
