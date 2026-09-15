# Writing a widget

## The folder

A widget is a folder in the vault. One file is enough.

```
.widgetarium/widgets/@you/clock/widget.tsx
```

The path names the widget: `@you/clock` is its id and `@you` is the pack it is filed under. Save the
file and the widget appears — nothing to publish, no plugin reload, no build step of your own. The
engine compiles the TSX itself and writes what it made into `build/` beside your file. Never write
or edit anything in `build/`.

A scope (the `@you` folder) can also hold `lib.js`, `tokens.css` and `theme.css`, shared by every
widget in it.

## The component

```tsx
import { createWidget, useData } from "widgetarium";
import { Card, Button } from "widgetarium/kit";
import type { CollectionGateway, ListAction, ValueGateway, VaultRecord } from "widgetarium";

type Entry = VaultRecord & { title?: string | null; done?: boolean | null };

type Props = {
	entries: CollectionGateway<Entry, { list: ListAction; update?: UpdateAction }>;
	heading: ValueGateway<string>;
};

function Checklist({ entries, heading }: Props) {
	const rows = useData(entries.list).rows;
	const said = String(useData(heading.get).data ?? "");
	return (
		<Card>
			<h3>{said}</h3>
			{rows.map((row) => (
				<div key={row.ref}>{row.value.title}</div>
			))}
		</Card>
	);
}

export default createWidget(Checklist, {
	title: "Checklist",
	props: {
		entries: {
			kind: "collection",
			label: "Entries",
			hint: "One note per entry.",
			verbs: { list: "required", update: "optional" },
			default: { path: "Tasks" },
		},
		heading: {
			kind: "value",
			type: "text",
			label: "Heading",
			verbs: { get: "required" },
			default: { value: "To do" },
		},
	},
});
```

TypeScript in a widget is **stripped, never checked**. The contract holds through the manifest, the
prop declaration and `can()` — not through the compiler. Types are there to help you read it.

## Props are gateways, all of them

There are no settings. A prop is either a `CollectionGateway` over a list of things or a
`ValueGateway` over one thing, and the person binds it to a folder, a file, a typed value or another
tile's prop. A primitive is a gateway too — `{ kind: "value", type: "number" }` — and that is what
lets a number typed into one tile be re-bound to another widget later.

What a prop declaration may carry:

| Key | Means |
| --- | --- |
| `kind` | `"collection"` or `"value"`. A collection prop may omit it. |
| `type` | For a value prop: `text`, `number`, `boolean`, `datetime`. The settings window draws its control from this. |
| `label`, `hint` | What the settings window shows a person. Whole sentences, English. |
| `verbs` | `{ list: "required", create: "optional", ... }`. A verb nothing provides still exists, with `can() === { can: false, reason }`. |
| `item.fields` | For a collection: the fields a row has, so the settings window can edit typed rows. |
| `default` | `{ path: "Folder" }` for a vault binding, `{ value: ... }` for a typed one. |
| `of` / `picks` / `field` | A selection over another prop, and the row that selection names. |
| `was` | The name this prop used to have. |
| `wasSetting: true` | This prop replaced a setting, so `tile.settings` is read for it. |
| `rowsFromText` | The old setting was a comma list; name the field its entries become. |

Read them through `useData`:

```tsx
const { rows } = useData(entries.list);      // a collection
const { data } = useData(heading.get);       // a value
await entries.update({ ref, data: { done: true } });
```

**Read the gateway inside the widget that draws it.** Reading a level up and passing the value down
gives a correct value and a stale screen — the classic failure in this codebase.

A gateway whose handlers touch no I/O declares `settlesNow`, so a value living in the tile answers in
the tick it is asked instead of blinking `isLoading` on its first frame. The engine does this for
typed bindings; you get it for free.

## One widget pointing at another

There is no context bus. A ref is `<tileId>/<propName>`, the board holds one registry of them, and a
prop bound `{ from: ref, ref: "w1/tabs" }` reads through the gateway that tile exposes. A selection —
which tab, which view, which card is open — is a box the engine owns over the very list it selects
from, so a pick naming a row the list no longer holds is no pick at all.

## The manifest

`manifest.json` is the catalogue's card. It carries what the engine must know **before** it runs any
of your code. A folder with nothing but `widget.tsx` installs and draws; the record is derived at
publish time.

```json
{
	"id": "@you/clock",
	"api": 2,
	"title": "Clock",
	"description": "The time where you are, and where the people you work with are.",
	"keywords": ["clock", "time", "zone", "hours"],
	"defaultSize": { "w": 6, "h": 3 },
	"maxSize": { "h": 4 },
	"collapseBelowPx": 90,
	"stackBelowPx": 220,
	"tallestPx": 42,
	"inline": false,
	"was": "@you/clock-v1"
}
```

- `id` is the folder path and the identity. `was` carries a previous id so old boards keep working.
- `api` is the widget API this widget needs. `2` is what a widget using Tailwind in its sheet
  declares. A widget outside the plugin's range does not mount, install or draw.
- `title`, `description`, `keywords` are what the catalogue searches and shows. Write them for
  somebody scanning a grid of cards.
- `defaultSize` is in grid cells. One cell is one medium control.
- `collapseBelowPx`, `stackBelowPx`, `tallestPx` are the responsive ladder — the widths at which the
  widget must give up detail, stack, and the height it must never exceed.
- `preview` carries the sample props the catalogue card draws with. A card with no preview is a
  worse card.

## What makes a widget draw at all

1. The folder is under `.widgetarium/widgets/<scope>/<name>/` and holds `widget.tsx`.
2. `export default createWidget(Component, { title, props })`.
3. Its `api` is inside the plugin's range.
4. Every prop whose `verbs` mark a verb `required` has a binding that provides it. A required verb
   the binding refuses means the widget does not mount — and the tile says so rather than going
   blank.
5. It is named in a board's `tiles` **and** placed in that board's `layout`.

If a widget is not appearing, walk those five in order before touching anything else.

## Adaptive behaviour

A widget is measured, not guessed at. Below `collapseBelowPx` it must be legible with less; below
`stackBelowPx` its row becomes a column. Use `useNarrowed` and the widget's own measured width
rather than a media query — a widget lives in a tile, not in a viewport, and the window's width says
nothing about the tile's.

## Before you say it is done

- It draws on the board with real vault data bound, not with typed defaults.
- It survives an empty collection and a failed read with something a person can read, not a blank.
- No hardcoded colour, radius or font — see [design.md](design.md).
- Its `keywords` would find it if somebody searched for what it does.
