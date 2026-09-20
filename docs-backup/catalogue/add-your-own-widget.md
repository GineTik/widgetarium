# Add your own widget

A widget is a folder in your vault with one file in it. Nothing to publish, nothing to build, no
plugin to reload — the folder is read as you write it.

## 1. Make the folder

```
.widgetarium/widgets/@you/clock/widget.tsx
```

The folder names the widget: `@you/clock` is its id, and `@you` is the pack it is filed under in
the catalogue.

## 2. Write the component, and say what it reads

```tsx
import { createWidget, useData } from "widgetarium";

function Clock({ zone }) {
	const { data } = useData(zone.get);
	return <div>{data?.value}</div>;
}

export default createWidget(Clock, {
	title: "Clock",
	props: { zone: { type: "line", default: { value: "UTC" } } },
});
```

Every prop is a gateway. A folder of notes, a file, or a value typed into the tile — the widget
reads through the same handle either way, and the person binding it chooses which. A prop holding a
single primitive names its type (`text`, `number`, `boolean`); a prop over a list of named things is
a collection.

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
