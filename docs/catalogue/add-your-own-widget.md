# Add your own widget

A widget is a folder in your vault with one file in it. Nothing to publish, nothing to build, no
plugin to reload — the folder is read as you write it.

## 1. Make the folder

```
.widgetarium/widgets/@you/clock/widget.tsx
```

The folder names the widget: `@you/clock` is its id, and `@you` is the pack it is filed under in
the catalogue.

## 2. Declare what it reads, then draw it

```tsx
import { IQuery, createWidget, defineLayout, defineMetadata } from "widgetarium";
import { z } from "zod";

const Clock = createWidget({
	inject: {
		getZone: IQuery.output(z.string().default("UTC")),
	},
	draw: ({ getZone: zone }) => <div>{new Date().toLocaleTimeString("en-GB", { timeZone: zone })}</div>,
});

export const metadata = defineMetadata(Clock, { title: "Clock", description: "The time in one zone." });

export const layout = defineLayout({ role: "indicator", size: { preferredWidth: 240, preferredHeight: "auto" } });

export default Clock;
```

A widget reads through queries and writes through commands, each typed by a zod schema.
`IQuery.output(schema)` is a value and arrives as that value; `IQuery.input(input).output(Page(Row))`
is a list, read a page at a time with `useData`; `ICommand.input(input)` is a write, awaited for its
answer. A folder of notes, a file, or a value typed into the tile — the widget reads through the same
declaration either way, and the person binding it chooses which. The names a hand-written note may use
for a field go in the schema, `done: z.boolean().optional().meta({ aka: ["complete"] })`. The widget is
TypeScript: a `widget.jsx` is refused with the command that renames it.

## 3. It shows up in the list on its own

Saved, the folder is picked up and a card is drawn in the catalogue under `@you`, live, with the
sample data the widget declares. Press Add and it lands on the board.

## Sharing it

A widget somebody else can install is a folder in a repository plus an entry in the vault's
catalogue index, `.widgetarium/catalogue.json`:

```jsonc
{
	"widgets": [
		{
			"id": "@you/clock",
			"title": "Clock",
			"repository": "https://github.com/you/widgets",
			"ref": "main",
			"path": "widgets/@you/clock",
			"files": ["widget.tsx"],
		},
	],
}
```

`ref` is resolved to a commit once, every file is taken at that commit, and nothing re-fetches on
its own. Installing runs the author's code in the plugin's own realm — the same as writing it
yourself.
