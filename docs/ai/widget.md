# Writing a widget

Only when `find` offers nothing close. A near neighbour with different controls beats a new widget.

**One widget draws one thing.** A total with its bar, a chart, a list of rows: each is a widget of
its own, and a section places them together. When the design asks for a figure over a list, write
two widgets reading the same folder, never one that draws both. Shared arithmetic goes in the scope's
`lib.js`.

## The folder

```
.widgetarium/widgets/@you/clock/widget.tsx
```

The path names it: `@you/clock` is the id, `@you` the scope. Save and it appears — no publish, no
reload. The engine compiles the TSX into `build/` beside your file. **Never write anything in
`build/`.** A scope may also hold `lib.js`, `tokens.css` and `theme.css`, shared by its widgets.
Beside the scopes the plugin lays `tsconfig.json` and `types/` — written, never edited, and what
makes an editor type every prop from the manifest instead of handing you `any`.

## The manifest is one value in the file

```tsx
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
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
		<>
			<h3>{said}</h3>
			{data.map((entry) => (
				<div key={entry.ref}>{entry.title}</div>
			))}
		</>
	);
});
```

**The type a prop holds is what it is.** An array is a collection, anything else a value. The
component takes props anonymously and annotates nothing — it is typed from the manifest.

**The two parentheses are what pays for that.** TypeScript stops inferring once a type argument is
written by hand, so the type goes in the first call and everything read literally — `writes` above
all — in the second. No wrapper can hide this.

**Never write a gateway type a second time.** `WidgetProps<typeof manifest>` is the whole set: every
prop plus what the engine hands over (`host`, `here`, `navigator`, `slots`, and `content` for an
inline widget).

## Props are gateways, all of them

There are no settings. A prop is a collection over a list or a value over one thing, bound by the
person to a folder, a file, a typed value or another tile's prop.

| Written                                         | Is                                                   |
| ----------------------------------------------- | ---------------------------------------------------- |
| `defineProp<Entry[]>()({ default: [] })`        | a list of rows                                       |
| `defineProp<string>()`, `<number>`, `<boolean>` | a primitive: a field, a number field or a switch     |
| `control: "text" \| "emoji" \| "icon"`          | the same primitive drawn otherwise                   |
| `defineProp<Shape>()({ default: {...} })`       | any other value, edited as JSON                      |
| `keep: "screen"`                                | a fact about this screen that never reaches the note |
| `picks: "selection", of: "tabs"`                | the row that pick names                              |

| Key             | Means                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `label`, `hint` | what the settings window shows; `label` is read off the key when not written                                                                                                         |
| `writes`        | only what the widget changes: `["create", "update"]`, or `{ archive: verb<Input>() }` for its own. Reads are always there. A verb missing here does not exist                        |
| `default`       | the value itself                                                                                                                                                                     |
| `describes`     | for a collection: the row's fields. A string is a label; an object may carry `label`, `type`, `required`, `aka`. **A field matches a note's properties exactly when it names `aka`** |
| `where`, `sort` | conditions and order the widget always reads through; a condition may `wants` another widget's prop                                                                                  |
| `aka`           | every name this prop had before, newest last                                                                                                                                         |
| `isVisible`     | a function over every prop, answering whether the settings window draws this one at all                                                                                              |
| `options`       | the answers a person picks between: `[{ value, label }]`. The window draws them as a list; nothing else is needed and no second prop holds them                                      |

**`isVisible` is how one switch changes what the window asks for.** It is handed every prop of this
widget as `{ kind, control, binding, isSet, value }` for a value and `{ ..., rows }` for a
collection, reading what the person typed and falling back to the default, so a rule is written
against the tile as it stands rather than against data that has to be fetched:

```ts
mode: defineProp<string>()({
	default: "placed",
	options: [
		{ value: "placed", label: "Widgets I place" },
		{ value: "per-row", label: "One widget per row" },
	],
}),
items: defineProp<Row[]>()({ default: [], isVisible: (props) => props.mode.value === "per-row" }),
```

**A choice is `options`, never a second prop holding the answers.** `of:` binds a prop to a box the
**widget** fills — a tab a person pressed, a card they opened — and a box draws nothing in the
settings window, so a configuration written that way cannot be changed there at all.

The same key works on a `slots` or a `mounts` entry, which is what lets one switch put a slot away
and bring a mount list out. A rule that throws draws the thing it would have hidden and says so in
the console — a settings window with a prop missing and no reason is worse than one prop too many.
The function lives in the code, so `manifest.generated.json` does not carry it: a catalogue that has
never run the widget draws every prop.

**A default never names a file or a folder, at any depth, under any spelling. This is a security
law.** A path in a default would let a widget read a person's notes before they chose anything, or
delete files on first render. `defineManifest` refuses `path` or `ref` in an object, in an array's
rows, or nested inside either, and renaming the field is not a fix.

A prop added after the first release must carry a default. A row type may not spell `ref` as a plain
string — `ref` is the address the engine mints.

## Reading and writing

```tsx
const { data, total } = useData(entries.list); // data is always an array
const page = useData(entries.list, { offset: 20, limit: 10 });
const { data } = useData(heading.get); // a value
if (canDo(entries.update)) await entries.update({ ref, data: { done: true } });
```

**Read the gateway inside the widget that draws it.** Reading a level up and passing the value down
gives a correct value and a stale screen.

**Everything that draws rows paginates.** A list read with no `limit` stops at a hundred rows and the
screen is silently short. An aggregate that needs more says how many in its own source.

## Spacing inside a widget

Never write a gap as a number. The engine sets three variables on every cell:

| Variable              | Between                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `var(--wg-gap-items)` | bare items of a list, the sections of the widget                    |
| `var(--wg-gap-parts)` | the parts of one item: a title and its value, an icon and its label |
| `var(--wg-gap-cards)` | items that each wear a plate                                        |

`SlotList` from `widgetarium/kit` draws what a slot holds and picks the right one itself.

## A missing picture

`<PlaceholderMark seed={album.title}/>` from `widgetarium/kit` — never an empty box, never a broken
image. One of twelve forms in one of seven tone washes, chosen by hashing the seed, so the same album
wears the same mark forever and on every machine. It fills what it stands in and takes that plate's
corner; `size={24}` makes it an avatar. `shape` and `tone` name one outright when the thing already
has a colour. It is `aria-hidden` — the label beside it is what a screen reader reads. No seed is the
empty seed: one mark, shared by everything nameless.

## A plate inside a widget

**Draw no background, border, corner or shadow of your own.** The engine draws the root — container
query, size, clipping — the board decides the tile's plate, and every plate you paint under it comes
from `widgetarium/kit`:

```tsx
<Card>…</Card>
<Card tone="warning">…</Card>
<Rows>{rows.map((row) => <Rows.Item key={row.ref}>…</Rows.Item>)}</Rows>
<Grid min={220}>{cards.map((card) => <Grid.Item key={card.ref}>…</Grid.Item>)}</Grid>
<Layout kind="rows">…</Layout>
<Card type="apart" side="start" across="column">…</Card>
```

One block goes in `Card`, rows of data in `Rows`, a grid of things in `Grid`. `Layout kind` is the
same behind one word, so a design changes by changing it. The rules they follow are in
[surfaces.md](surfaces.md).

**The laws decide it, not you.** Two plates stand from the region, the tile's own included, so a
tile already wearing a `group` leaves you one plate and the next is refused: it paints nothing and
says why in the console. A `kind`, `type`, `tone`, `side` or `across` the kit never had is refused
the same way — the default is drawn and the console names what it took instead.

## The rest of the manifest

- `title`, `description`, `keywords` — what the catalogue searches. `description` is the one question
  the widget answers.
- `role` — required. Without one the widget is never given a surface.
- `slots` — the holes other widgets fill:
  `card: { of: "widget", default: "@default/task-card", surface: "group", gives: { ... } }`.
- `mounts` — named lists of widgets the person places, each with its own settings. A mount's settings
  are reached from the board itself while it is being edited, not only from the holder's window.
- `size: { collapseBelowPx, stackBelowPx, tallestPx, shortestPx }` — the responsive ladder, in
  pixels. Below `collapseBelowPx` the widget must be legible with less; below `stackBelowPx` its row
  becomes a column. Use `useNarrowed`, never a media query.
- `preview` — sample props the catalogue card draws with.
- `inline: true` — a widget that stands in text; it is handed `content` and `reader`.
- `migrate` — `migration({ from: { ...old props }, run })` for a change tiles cannot follow alone.

`manifest.generated.json` beside the widget is the same manifest written out for a catalogue that has
not run the code. Never edit it.

## Before you say it is done

- `check <id>` exits 0.
- It draws with real vault data bound, not typed defaults.
- It survives an empty collection and a failed read with something readable.
- Its `keywords` would find it.
