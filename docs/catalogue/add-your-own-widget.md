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
import { IValueGateway, createWidget, defineLayout, defineMetadata, z } from "widgetarium";

const Clock = createWidget({
	inject: {
		zone: IValueGateway.of(z.string().default("UTC")).pick("get"),
	},
	draw: ({ zone }) => <div>{new Date().toLocaleTimeString("en-GB", { timeZone: zone })}</div>,
});

export const metadata = defineMetadata(Clock, { title: "Clock", description: "The time in one zone." });

export const layout = defineLayout({ role: "figure", size: { preferredWidth: 240, preferredHeight: "auto" } });

export default Clock;
```

Every prop is a gateway class typed by a zod schema. A folder of notes, a file, or a value typed into
the tile — the widget reads through the same declaration either way, and the person binding it
chooses which. `IValueGateway` holds one value and arrives as that value when it picks only `"get"`;
`IListGateway` and `ICrudGateway` hold rows and arrive as a gateway read with `useData`. Without
`.pick` a gateway has every method of its interface; with it, only the ones named, reads included. A record that does not fit its
schema is left out and shown on the red "!" beside the prop; a field's other names go in the schema,
`done: z.boolean().optional().meta({ aka: ["complete"] })`. The widget is TypeScript: a
`widget.jsx` is refused with the command that renames it.

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
