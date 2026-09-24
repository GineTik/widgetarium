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
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 200, stackBelowPx: 320 },
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

## A picture: `Emblem`

Every picture that stands for something — a person, a company, a project, a place — is an `Emblem`:
one component whether it ends up reading as an avatar, a logo or a mark.

```tsx
<Emblem label={person.name}>
	<EmblemImage src={person.photo} />
	<EmblemFallback seed={person.name} />
</Emblem>

<Emblem size="l" shape="rounded" label={project.title}>
	<EmblemDiceBear style="shapes" seed={project.ref} options={{ backgroundColor: ["b6e3f4"] }} />
	<EmblemFallback seed={project.title} />
</Emblem>
```

`size` is `s` (24), `m` (40), `l` (64), `xl` (96) or a number; `shape` is `circle`, `rounded` or
`square`; `label` is what a screen reader reads. `EmblemFallback` stands until the picture has
loaded and wherever it failed; with no children it draws the `PlaceholderMark` below.

**Where the picture comes from, in this order:**

1. What the person gave — a file they named, an address in a note, a picture already in the vault.
   Only when they ask for one on their machine do you read it from there.
2. A field of the record that already holds a picture.
3. Otherwise `EmblemDiceBear`, chosen for what the thing is. `style` is a DiceBear style name,
   `seed` a stable value of the record — its `ref`, never a value that changes — and `options` is the
   style's own options object as DiceBear documents it. Pick by kind and leave the exact style to the
   design:
   - a person: a face style — `notionists`, `lorelei`, `open-peeps`, `personas`, `micah`, `adventurer`,
     `pixel-art` and the rest of the faces;
   - a company, a team, a brand: `initials`, `icons`, or a geometric style;
   - a project, a topic, anything abstract: a minimal style — `shapes`, `rings`, `glass`, `blobs`,
     `marbles`, `loops`, `identicon`, `waves`;
   - a playful thing: `thumbs`, `fun-emoji`, `initial-face`.

**Only styles under an allowed licence draw** — CC0 1.0, CC BY 4.0 and MIT. The four styles licensed
"free for personal and commercial use" (`avataaars`, `bottts` and their neutral versions) are
refused: they draw a mark saying the picture is unavailable for licensing reasons, and the console
says which. Do not reach for them.

## A missing picture

`<PlaceholderMark seed={album.title}/>` from `widgetarium/kit` — never an empty box, never a broken
image. One of twelve forms in one of seven tone washes, chosen by hashing the seed, so the same album
wears the same mark forever and on every machine. It fills what it stands in and takes that plate's
corner; `size={24}` makes it an avatar. `shape` and `tone` name one outright when the thing already
has a colour. It is `aria-hidden` — the label beside it is what a screen reader reads. No seed is the
empty seed: one mark, shared by everything nameless.

## A badge, a heading, a "show more", a progress bar

Take these from `widgetarium/kit` rather than drawing them:

```tsx
<Badge color="purple" size="s">implementing</Badge>
<Badge tone="error" variant="solid">3</Badge>
<Heading level={3}>Due this week</Heading>
<Heading level={3} size={5}>Smaller, same outline</Heading>
<ShowMore remaining={total - rows.length} isLoading={isLoading} onMore={loadMore} />
<ProgressBar value={percent} label="Loaded" />
<ProgressBar value={percent} isControlled onChange={seek} label="Seek" />
<StatusProgress shape="circle" value={percent} label="Backup" />
<ProgressBar shape="circle" size={72} value={percent} displayValue={({ value }) => `${value}%`} />
```

A badge is drawn from one ink: `color` names one of `red orange yellow green cyan blue purple pink`
(Obsidian's own palette through `--wg-kit-<name>`, which the theme repaints for light and dark), any
colour, or a pair `{ light, dark }` when one colour cannot serve both themes; `tone` names a role instead
(`neutral accent success warning error info note standout highlight`). The wash behind it and the
text on it are both mixed from that ink. `variant` is `soft` (the default), `solid`, `outline`, `dot`
or `text`; `size` is `m` or `s`.

`Heading` draws `h1`–`h6`: `level` is the outline, `size` is the look and defaults to the level. In a
widget it is an `h3` unless asked; `level` or `size` 1 and 2 are a region's title, which `check`
refuses outside a `text` or `layout` widget. Every size comes from `--wg-kit-h<n>-*`, so a design
system restyles all of them at once.

`ShowMore` is the full-width button under a list that reads a page at a time, draws nothing when
`remaining` is not above `0`, and names the count when `remaining` is given.

`Button` and `IconButton` own their states: `isLoading` draws the kit's spinner, disables the press
and says `aria-busy`, so a widget never passes a loader of its own; `isDone` swaps the mark for a
tick and washes the button in the success tone, and it stays pressable; `disabled` is the plain
disabled button. `Spinner` is that same spinner on its own, sized in pixels.
`ProgressBar` is Material 3's wavy indicator, as a line or as a ring: `shape` is `line` (the default)
or `circle`, and a circle takes `size` in pixels. `displayValue` is what stands over the line or
inside the ring: nothing by default, anything you pass — a number, an `Icon`, an `Emoji`, a component
of your own — or a function handed `{ value, state }` that answers with what to draw.
On a line it stands at the right end and the line gives up exactly the room it takes, so the two
together are the full width; the room grows and shrinks with a transition, so a value that comes and
goes never makes anything jump. `tone` paints
it, `isWavy={false}` draws it straight, and `hasStopMark` adds Material's dot at the far end.
`isControlled` is what hands a line to the person: only then does the upright cursor appear, only
then can it be dragged or moved with the arrow keys, and only then does it answer as a slider rather
than a progress bar. `onChange` is how it tells you where they left it.

`StatusProgress` is that same bar wearing the three states a person reads at a glance: a dashed track
at `0`, the accent wave while it runs, and the success tone with a tick at `100`, which grows in as
it arrives. It takes every prop `ProgressBar` does, plus `tones` to repaint any state
(`{ done: "info" }`) and its own `displayValue` where the tick is not what you want. Reach for it whenever a bar means "not started / going /
finished"; the plain `ProgressBar` knows nothing of states.

## Choosing, opening, switching

The kit's controls follow Radix and shadcn: parts with flat names, state that works controlled or
not, and the state written on the element.

```tsx
<Select value={status} onValueChange={setStatus}>
	<SelectTrigger>
		<SelectValue placeholder="Status" />
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="todo">To do</SelectItem>
		<SelectItem value="done">Done</SelectItem>
	</SelectContent>
</Select>

<Popover>
	<PopoverTrigger asChild>
		<IconButton label="More">
			<Icon name="ellipsis" />
		</IconButton>
	</PopoverTrigger>
	<PopoverContent>
		<PopoverItem onClick={archive}>Archive</PopoverItem>
	</PopoverContent>
</Popover>
```

- **One naming rule.** `value` / `defaultValue` / `onValueChange` (Select, Segmented, Tabs),
  `checked` / `defaultChecked` / `onCheckedChange` (Switch), `open` / `defaultOpen` / `onOpenChange`
  (Popover, Select, SidebarSheet), `month` / `defaultMonth` / `onMonthChange` (Calendar). Pass the
  first to control it, the second to let it hold its own.
- **`asChild`** on `Button`, `IconButton`, `Badge`, `Card`, `Plate`, `List`, `Row`, `Sidebar` and
  `PopoverTrigger` draws the kit's look and behaviour on your own element — an `<a>` that is a
  button, a row that is a link. Props merge the Radix way: yours win, both click handlers run.
- **Keyboard comes built in**: arrows and Home/End in `Segmented`, in an open Popover's items and
  in `Calendar` (PageUp/PageDown turn the month); Escape closes a Popover and hands focus back.
- **State is on the element**: `data-state="open|closed|checked|unchecked|active|inactive"`,
  `data-disabled`, `data-highlighted`, `data-loading`, `data-selected`, `data-today`.
- An open `PopoverContent` carries `--wg-kit-anchor-width`, `--wg-kit-pop-available-width`,
  `--wg-kit-pop-available-height` and `--wg-kit-pop-origin`, so content can match its trigger and
  stop at the screen's edge in plain CSS.

## A table, its pages, and a skeleton

Rows are drawn by `DataTable`, the way shadcn pairs a data table with its table parts, except that
it is the kit's own component rather than code you copy, so how every table behaves changes in one
place:

```tsx
const read = useData(records.list, {
	sort: sort ? [{ prop: sort.key, dir: sort.direction }] : [],
	offset: (page - 1) * size,
	limit: size,
});

<DataTable
	rows={read.data}
	columns={[
		{ key: "client", label: "Client" },
		{ key: "status", label: "Status", render: (row) => <Badge size="s">{row.status}</Badge> },
		{ key: "due", label: "Due", type: "date" },
		{ key: "amount", label: "Amount", type: "number" },
	]}
	sort={sort}
	onSortChange={setSort}
	selected={picked}
	onSelect={setPicked}
	isLoading={read.isLoading}
	failure={read.failure}
	page={page}
	count={Math.ceil(read.total / size)}
	onPageChange={setPage}
/>;
```

- A column's `type` (`text`, `number`, `date`) aligns its head and its cells together; `number`
  and `date` stand at the end. `align` overrides it.
- A cell shows `row[key]`, a number written for a person and a dash for nothing. `render(row)`
  draws anything else in it — a kit component, one of the widget's own, or markup of its own.
- `onSortChange` makes every head a sort button, and `sortable: false` takes one out. The table
  only asks for an order, `{ key, direction }`; the gateway sorts, because a table sorting its own
  rows would sort one page of a hundred and say nothing.
- `onSelect(key, row)` makes a row pressable by pointer and keyboard; `selected` marks it. A row's
  key is its `ref`, else its `id`, else its place — `rowKey(row, index)` names another.
- `rowProps(row)` puts a class, a handler or a `data-*` on a row.
- `isLoading` with no rows draws skeleton rows, `failure` a sentence in the error tone, and no rows
  the `empty` sentence. `count` over one draws the kit's `Pagination` under it.

A table `DataTable` cannot draw — cells spanning columns, rows in groups — is built from the parts.
They are shadcn's, and a table scrolls sideways inside its own box when its columns are wider than
the region. There are no cards for a narrow region: the table stays a table.

```tsx
<Table>
	<TableCaption>Invoices due this month</TableCaption>
	<TableHeader>
		<TableRow>
			<TableHead>Client</TableHead>
			<TableHead className="text-right">Amount</TableHead>
		</TableRow>
	</TableHeader>
	<TableBody>
		{rows.map((row) => (
			<TableRow key={row.ref} data-state={row.ref === picked ? "selected" : undefined}>
				<TableCell>{row.client}</TableCell>
				<TableCell className="text-right">{row.amount}</TableCell>
			</TableRow>
		))}
	</TableBody>
</Table>
```

`TableFooter` holds totals. A row marked `data-state="selected"` is washed in the accent.

Pages are drawn by the kit whole, so how a pagination looks and behaves changes in one place:

```tsx
<Pagination page={page} count={count} onPageChange={setPage} />
```

It draws the first and last page, the current one with `siblings` on each side (1 by default), and
a gap wherever pages were left out. `variant="compact"` draws `‹ 3 / 20 ›` instead, and a full one
turns compact by itself in a widget narrower than 360px. `defaultPage` in place of `page` keeps the
page inside the pagination. One page or none draws nothing.

Reach for the parts only for a pagination the ready one cannot draw. They are shadcn's, and
`paginationItems(page, count, siblings)` says which pages to lay out, with `{ kind: "gap" }` where
pages were left out:

```tsx
<Pagination>
	<PaginationContent>
		<PaginationItem>
			<PaginationPrevious disabled={page === 1} onClick={() => setPage(page - 1)} />
		</PaginationItem>
		{paginationItems(page, count).map((entry) =>
			entry.kind === "gap" ? (
				<PaginationItem key={entry.key}>
					<PaginationEllipsis />
				</PaginationItem>
			) : (
				<PaginationItem key={entry.page}>
					<PaginationLink isActive={entry.page === page} onClick={() => setPage(entry.page)}>
						{entry.page}
					</PaginationLink>
				</PaginationItem>
			),
		)}
		<PaginationItem>
			<PaginationNext disabled={page === count} onClick={() => setPage(page + 1)} />
		</PaginationItem>
	</PaginationContent>
</Pagination>
```

A page read through a gateway is `useData(list, { offset: (page - 1) * size, limit: size })`, and
`total` beside the rows is what `count` is made from. `ShowMore` stays the answer for a list that
grows as it is read.

`Skeleton` stands where something has not been read yet, in the shape of what is coming. `kind`
names the kit item it stands in for: `block` (sized by its class), `text` (`lines`, 3 by default),
`emblem` (`size`, `shape`, as `Emblem` takes them), `button` (`size`, `block`), `field` (`size`),
`row`, `sparkline` (`height`), `chart` and `card`. It is hidden from a screen reader; the thing
that is loading says `aria-busy` itself. A button, a field, an icon button and their skeletons read
one height per size, `--wg-kit-control-s|m|l`, so a theme that changes one changes all of them.

`<CodeBlock code={source} label="Usage" />` shows code as it is written: monospace, on the kit's
fill, scrolling sideways rather than wrapping. It draws text only, never markup.

## A chart and a sparkline

A chart is composed the way shadcn composes one: Recharts' own parts inside the kit's
`ChartContainer`, all of them from `widgetarium/kit/charts`. Import nothing from `recharts` itself;
the plugin holds the one copy, and it draws with the plugin's own React.

```tsx
import {
	Area,
	AreaChart,
	CartesianGrid,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	XAxis,
} from "widgetarium/kit/charts";

const config = { notes: { label: "Notes" }, links: { label: "Links", color: 2 } };

<ChartContainer config={config}>
	<AreaChart data={rows} accessibilityLayer>
		<CartesianGrid vertical={false} />
		<XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
		<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
		<ChartLegend content={<ChartLegendContent />} />
		<Area dataKey="notes" stroke="var(--color-notes)" fill="var(--color-notes)" fillOpacity={0.18} />
		<Area dataKey="links" stroke="var(--color-links)" fill="var(--color-links)" fillOpacity={0.18} />
	</AreaChart>
</ChartContainer>;
```

`config` names every series once: `label` is what the tooltip and the legend say, `color` is a
number from 1 to 5 (`--wg-kit-chart-1…5`), a palette name (`purple`) or a tone (`success`), and
left out it is the series' place in the config. The container turns each key into
`--color-<key>`, and a mark paints with that variable, never with a colour of its own: a hex or an
`rgb()` is refused and the place's colour drawn instead. The container is 16:9 unless its class
says otherwise. `ChartTooltipContent` takes `indicator` (`dot`, `line`, `dashed`), `hideLabel`,
`hideIndicator`, `labelFormatter`, `formatter`, `nameKey` and `labelKey`; `ChartLegendContent`
takes `hideIcon` and `nameKey`, and a config entry's `icon` is a kit icon name. A tooltip or legend
of your own reads the config with `useChart()` inside the container. Recharts' raw `Tooltip` and
`Legend` are not handed over: `ChartTooltip` and `ChartLegend` are them. `Area`, `Bar`,
`Line`, `Pie`, `Radar`, `RadialBar`, `Scatter` and `Funnel` stand still on load; pass
`isAnimationActive` to make one move.

A sparkline is a line with no axes drawn at the size of a word, from the main kit and with no
Recharts under it, so a hundred rows can each carry one:

```tsx
<Sparkline data={rows} dataKey="value" color="success" label="Notes, twelve weeks">
	<SparklineArea />
	<SparklineLine />
	<SparklineDot at="last" />
</Sparkline>
```

`data` is numbers or rows with `dataKey`; anything that is not a number is a gap. It fills its
parent's width and is `height` pixels tall (32 by default). `SparklineBars` draws bars instead,
the last one full (`highlight` names another index, or `"none"`); `SparklineDot` takes `at`:
`first`, `last`, `min`, `max` or an index. With no children it draws the line alone. Without
`label` it is hidden from a screen reader, so give one when nothing beside it says the same.

## Tailwind, when the widget's styling asks for it

A `widget.css` may be a Tailwind sheet. Three imports give it the kit's whole vocabulary:

```css
@import "tailwindcss";
@import "widgetarium/theme.css";
@import "../theme.css";

@theme {
	--color-brand: oklch(0.72 0.11 221);
}
```

The kit's theme names every token as a Tailwind one — `bg-group`, `bg-fill`, `text-muted`,
`text-accent`, `rounded-plate`, `rounded-pill`, `text-sm`, `text-h3`, `gap-cards`, `p-plate` — so you
repeat no variable. A scope file beside your widgets carries what all of them share, and a `@theme`
of your own comes last and wins: add a colour, or change one of the kit's for this widget alone
(`--radius-plate: 18px`). `--color-*: initial` drops a whole namespace, `--*: initial` starts from
nothing.

Style a kit control's state with Tailwind's data variants — `data-[state=open]:bg-group`,
`data-[highlighted]:bg-fill` — and join classes with `cn` from `widgetarium/kit`: it is shadcn's,
so a class you pass wins a conflict with the kit's own (`cn("p-plate", "p-2")` is `p-2`), and it
knows the theme's names, so `text-h3 text-muted` keeps both.

`@plugin` and `@config` load JavaScript and are refused; `@utility` and `@custom-variant` are not.
Preflight is refused too, and so is every other name under `widgetarium/`. A widget whose styling
needs Tailwind declares `api: 2`.

## A plate inside a widget

**Draw no background, border, corner or shadow of your own.** The engine draws the root — container
query, size, clipping — the board decides the tile's plate, and every plate you paint under it comes
from `widgetarium/kit`:

```tsx
<Card>…</Card>
<Card tone="warning">…</Card>
<Rows>{rows.map((row) => <LayoutItem key={row.ref}>…</LayoutItem>)}</Rows>
<Grid min={220}>{cards.map((card) => <LayoutItem key={card.ref}>…</LayoutItem>)}</Grid>
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
- `role` — required, and one. Without one the widget is never given a surface; a widget drawing two
  roles (a figure and its rows) is two widgets — `brief.md` law 14.
- `slots` — the holes other widgets fill:
  `card: { of: "widget", default: "@default/task-card", surface: "group", gives: { ... } }`.
- `mounts` — named lists of widgets the person places, each with its own settings. A mount's settings
  are reached from the board itself while it is being edited, not only from the holder's window.
- `size` — required. **`preferredWidth` and `preferredHeight` are the size the widget prefers, never a
  size it is promised.** The widget is created at it and the engine leans toward it: the width is a
  ceiling the cell narrows under when the region is narrower, `"full"` takes the whole cell; the
  height is where a short widget is drawn to, and a widget with more to draw grows past it, `"auto"`
  is as tall as it draws. `keepsRatio: true` holds height to width as the two numbers say. `at` steps
  by the width of the **region** the widget stands in, never the screen, and switches at once, the way
  a `max-width` query does: `at: [{ belowPx: 520, preferredWidth: "full" }]`. A widget that needs a
  hard size bounds its own container in its sheet. `collapseBelowPx` and `stackBelowPx` stay the
  floors a row stacks and a widget collapses at. Use `useNarrowed`, never a media query.
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
