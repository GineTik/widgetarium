# Writing a widget

## The folder

A widget is a folder in the vault. One file is enough.

```
.widgetarium/widgets/@you/clock/widget.tsx
```

The path names it: `@you/clock` is the id, `@you` the pack. Save and it appears — no publish, no
reload, no build step of your own. The engine compiles the TSX and writes into `build/` beside your
file. **Never write or edit anything in `build/`.**

A scope can also hold `lib.js`, `tokens.css` and `theme.css`, shared by every widget in it. Beside
the scopes the plugin lays `tsconfig.json` and `types/` — written, never edited, and what makes an
editor type every prop from the manifest instead of handing you `any`.

## The component and its manifest

Everything a widget says about itself is one value: `export const manifest = defineManifest({ ... })`.
The engine reads it from the running code, so there is no second file to keep in step and no name,
version or api to write by hand.

```tsx
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import { Card } from "widgetarium/kit";
import type { VaultRecord } from "widgetarium";

type Entry = VaultRecord & { title?: string | null; done?: boolean | null };

export const manifest = defineManifest({
	title: "Checklist",
	description: "The entries still to do, ticked off where they stand.",
	keywords: ["checklist", "todo", "tasks"],
	role: "collection",
	size: { collapseBelowPx: 200, stackBelowPx: 320 },
	props: {
		entries: defineProp<Entry[]>()({
			label: "Entries",
			hint: "One note per entry.",
			default: [],
			writes: ["update"],
			describes: { title: "Title", done: { label: "Done", type: "boolean" } },
		}),
		heading: defineProp<string>()({ default: "To do" }),
	},
});

export default createWidget(manifest, ({ entries, heading }) => {
	const { data } = useData(entries.list);
	const said = String(useData(heading.get).data ?? "");
	return (
		<Card>
			<h3>{said}</h3>
			{data.map((entry) => (
				<div key={entry.ref}>{entry.title}</div>
			))}
		</Card>
	);
});
```

**The type a prop holds is what it is.** An array makes a collection, anything else a value. The
component takes props anonymously and annotates nothing — it is typed from the manifest, and a verb
never declared in `writes` does not exist on the gateway.

**The two parentheses are what pays for that.** TypeScript stops inferring once a type argument is
written by hand, so the type goes in the first call and everything read literally — `writes` above
all — in the second. No wrapper can hide this.

**Never write a gateway type out a second time.** `WidgetProps<typeof manifest>` is the whole set —
every prop plus what the engine hands over (`host`, `here`, `navigator`, `slots`, `mounts`, and
`content` for an inline widget):

```tsx
type Props = WidgetProps<typeof manifest>;

function usePageSize(pageSize: Props["pageSize"]) {}
```

A hand-written `CollectionGateway<Entry, { list: ListAction }>` beside a manifest that already says it
is the same fact twice, and the two drift on the first change.

## Props are gateways, all of them

There are no settings. A prop is a `CollectionGateway` over a list or a `ValueGateway` over one
thing, bound by the person to a folder, a file, a typed value or another tile's prop. One function
for all of them, `defineProp<Held>()({ ... })`:

| Written                                         | Is                                                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `defineProp<Entry[]>()({ default: [] })`        | a list of rows                                                                                                    |
| `defineProp<string>()`, `<number>`, `<boolean>` | a primitive; a field, a number field or a switch                                                                  |
| `control: "text" \| "emoji" \| "icon"`          | the same primitive drawn otherwise: an area, a Fluent emoji, a kit or Lucide icon, picked off a grid, never typed |
| `defineProp<Shape>()({ default: {...} })`       | any other value, edited as JSON                                                                                   |
| `keep: "screen"`                                | a fact about this screen that never reaches the note                                                              |
| `of: "tabs"`                                    | which row of another prop is picked                                                                               |
| `picks: "selection", of: "tabs"`                | the row that pick names                                                                                           |

| Key             | Means                                                                                                                                                                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`, `hint` | What the settings window shows. Whole sentences, English. `label` is read off the key when not written.                                                                                                                                                                                             |
| `writes`        | Only what the widget changes: `["create", "update"]`, or `{ archive: verb<Input>() }` for its own. Reads are always there and never declared. A verb missing here does not exist in the types or at runtime; every call still goes through `can()`, because the tile decides which are switched on. |
| `default`       | The value itself. Never a path in the vault — the person binds a folder.                                                                                                                                                                                                                            |
| `describes`     | For a collection: what the row type could not say. A string is a label; an object may carry `label`, `type`, `required`, `aka`. **A field takes part in matching a note's properties exactly when it names `aka`.**                                                                                 |
| `where`, `sort` | Conditions and order the widget always reads through. A condition may `wants` another widget's prop.                                                                                                                                                                                                |
| `aka`           | Every name this prop had before, newest last.                                                                                                                                                                                                                                                       |
| `design: true`  | Shown on the Design tab.                                                                                                                                                                                                                                                                            |

A prop added after the first release must carry a default or the build refuses it. A row type may not
spell `ref` as a plain string — `ref` is the address the engine mints, and `defineManifest` refuses a
described or defaulted one.

Read through `useData`, which answers with `data` and nothing else:

```tsx
const { data, total } = useData(entries.list); // a collection, data is always an array
const page = useData(entries.list, { offset: 20, limit: 10 }); // one page; page.total counts them all
const { data } = useData(heading.get); // a value
if (canDo(entries.update)) await entries.update({ ref, data: { done: true } });
```

**Read the gateway inside the widget that draws it.** Reading a level up and passing the value down
gives a correct value and a stale screen — the classic failure in this codebase.

A gateway touching no I/O declares `settlesNow`, so a value living in the tile answers in the tick it
is asked instead of blinking `isLoading`. The engine does this for typed bindings.

## Spacing inside a widget

Never write a gap as a number. The engine sets three variables on every cell, from the same steps the
board is laid by:

| Variable              | Between                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `var(--wg-gap-items)` | bare items of a list, the sections of the widget                    |
| `var(--wg-gap-parts)` | the parts of one item: a title and its value, an icon and its label |
| `var(--wg-gap-cards)` | items that each wear a plate                                        |

`SlotList` from `widgetarium/kit` draws what a slot holds, picking `--wg-gap-cards` when the slot
wears a plate and `--wg-gap-items` when it does not:

```tsx
import { SlotList } from "widgetarium/kit";

function Picks({ entries, slots }: Props) {
	const rows = useData(entries.list).data;
	return <SlotList slot={slots?.item ?? null} rows={rows} keyOf={(row) => row.ref} give={(row) => ({ note: row })} />;
}
```

It also takes `children` in place of `rows`. Before writing an endless list, place `@default/feed`:
its slot `item` is fed `source`, the record read whole through the collection's `get`.

A widget in a slot receives what its parent feeds it; every other prop arrives as a gateway over its
declared default, or over what `slots.<name>.props` gives it.

## One widget pointing at another

There is no context bus. A ref is `<tileId>/<propName>`; a prop bound `{ from: ref, ref: "w1/tabs" }`
reads through the gateway that tile exposes. A selection is a box the engine owns over the very list
it selects from, so a pick naming a row the list no longer holds is no pick at all.

The component returns its own element and nothing around it. The engine draws the root — container
query, size, clipping. **Draw no background, border or shadow on your root**: the group decides that,
by the laws in [surfaces.md](surfaces.md). Paint one only when it is the content itself. Do not wrap
in `WidgetRoot`.

## What the manifest carries besides props

- `title`, `description`, `keywords` — what the catalogue searches and shows. `description` is the one
  question the widget answers.
- `role` — required for every widget a board can hold: `navigation`, `indicator`, `indicators`,
  `collection`, `detail`, `composer`, `control`, `media`, `text`. It decides how far the board may set
  the widget apart. Without one it is never given a surface.
- `slots` — the holes other widgets fill: `card: { of: "widget", default: "@default/task-card",
surface: "raise", gives: { ... } }`. `surface` is what every item the slot draws wears by default.
- `size: { collapseBelowPx, stackBelowPx, tallestPx, shortestPx }` — the responsive ladder, in pixels.
- `preview` — sample props the catalogue card draws with.
- `inline: true` — a widget that stands in text; it is handed `content` and `reader`.
- `migrate` — `migration({ from: { ...old props }, run })` for a change tiles cannot follow alone.

`manifest.generated.json` beside the widget is the same manifest written out for a catalogue that has
not run the code. `npm run manifest` writes it; never edit it.

## What makes a widget draw at all

1. The folder is `.widgetarium/widgets/<scope>/<name>/` and holds `widget.tsx`.
2. `export default createWidget(manifest, Component)`.
3. The tile's `widget` names that id, plus a version when it names one (`@you/clock@<commit>`).
4. It is named in a board's `tiles` **and** placed in that board's `layout`.

Walk those four in order before touching anything else. A verb that does nothing is a verb the tile
has not switched on — `can()` says so, and the Data tab lists every verb with a switch.

## Adaptive behaviour

Below `collapseBelowPx` the widget must be legible with less; below `stackBelowPx` its row becomes a
column. Use `useNarrowed` and the measured width, never a media query.

## Before you say it is done

- It draws with real vault data bound, not typed defaults.
- It survives an empty collection and a failed read with something readable.
- No hardcoded colour, radius or font.
- Its `keywords` would find it.
