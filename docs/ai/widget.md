# Writing a widget

Only when `find` offers nothing close. A near neighbour with different controls beats a new widget.

**One widget draws one thing.** A total with its bar, a chart, a list of rows: each is a widget of
its own, and a section places them together. When the design asks for a figure over a list, write
two widgets reading the same folder, never one that draws both. Shared arithmetic goes in the scope's
`lib.ts`.

## The folder

```
.widgetarium/widgets/@you/clock/widget.tsx
```

The path names it: `@you/clock` is the id, `@you` the scope. Save and it appears — no publish, no
reload. The engine compiles the TSX into `build/` beside your file. **Never write anything in
`build/`.** A widget is TypeScript: `widget.tsx`, or `widget.ts` when it draws no JSX. A
`widget.jsx` or `widget.js` is refused and draws its refusal instead; rename it to `widget.tsx`,
which builds as it stands. A scope may also hold `lib.ts`, `tokens.css` and `theme.css`, shared by its
widgets; a widget imports the lib as `@you/lib`, is typed by it, and rebuilds when it changes. An older
`lib.js` still loads.

**A widget may split its code into sibling modules.** `widget.tsx` stays the entry and imports the
rest relatively — `import { columns } from "./board-state"`, `"./parts/card"` — any `.ts` or `.tsx`
in the folder or a folder under it. The engine builds, installs and checks them as one widget. Logic
only this widget uses lives in its own folder; the scope's `lib.ts` is for what several widgets of one
scope share, and a hook or part every scope could use belongs in the kit.

Beside the scopes the plugin lays `tsconfig.json` and `types/` — written, never edited, and what
makes an editor type every prop from its declaration instead of handing you `any`.

## Props, metadata and layout

```tsx
import {
	ICrudGateway,
	IHost,
	IValueGateway,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";

const EntrySchema = VaultRecordSchema.extend({
	title: z.string().optional(),
	done: z
		.boolean()
		.optional()
		.meta({ aka: ["complete", "finished"] }),
});

const Checklist = createWidget({
	inject: {
		entries: ICrudGateway.of(EntrySchema).pick("list", "update"),
		heading: IValueGateway.of(z.string().default("To do")).pick("get"),
		host: IHost,
	},
	draw: ({ entries, heading }) => {
		const { data } = useData(entries.list, { limit: 20 });
		return (
			<>
				<h3>{heading}</h3>
				{data.map((entry) => (
					<div key={entry.ref}>{entry.title}</div>
				))}
			</>
		);
	},
});

export const metadata = defineMetadata(Checklist, {
	title: "Checklist",
	description: "The entries still to do, ticked off where they stand.",
	keywords: ["checklist", "todo", "tasks"],
	props: { entries: { hint: "One note per entry.", describes: { done: { label: "Done", type: "boolean" } } } },
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 200, stackBelowPx: 320 },
});

export default Checklist;
```

**`createWidget({ inject, draw })` declares and draws, `metadata` describes, `layout` places.**
`inject` holds the gateways the widget reads and may be left out when it reads none; `draw` gets
them typed. `defineMetadata` takes the created widget. Never annotate `inject` or `draw` with a type:
that erases what the component is typed from. Code outside `draw` that needs the prop types keeps
`const props = defineProps({...})`, reads `DrawnProps<typeof props>` and passes `inject: props`.

### A prop is a gateway class

| Declared                                                    | Arrives as                                                |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `getTasks: IQuery.expects(z.array(RowSchema))`              | a list read: `useData(getTasks, { where, sort, limit })`  |
| `getHeading: IQuery.expects(z.string().default("To do"))`   | the value: `draw: ({ getHeading: heading }) => …`         |
| `ICommand.sends(InputSchema)`, or `ICommand` with no input  | `await move(input)` answers `{ ok }` or `{ ok, reason }`  |
| `IValueGateway.of(z.string().default("To do")).pick("get")` | the value, read and checked against the schema            |
| `IValueGateway.of(schema).pick("get", "update")`            | `{ value, update }`                                       |
| `IValueGateway.of(schema)`                                  | `{ value, update, remove }`                               |
| `IListGateway.of(RowSchema, { where, sort, default })`      | a gateway that reads: `list`, `get`                       |
| `ICrudGateway.of(RowSchema)`, `.pick("list", "create")`     | a gateway with every verb, or only the ones picked        |
| `ISlot.of<Given>({ default, surface, gives })`              | a function drawing the widget in the slot, or `null`      |
| `IMounts.of({ default: [] })`                               | `MountEntry[]`, each drawn with `<Mounted entry={...} />` |
| `IHost`, `INavigator`, `IHere`                              | what the engine hands over, only when declared            |
| `IReader`, `IContent`                                       | the passage and its reader, for an `inline` widget        |
| `ICatalogue`, `IFoldIntoGroup`, `IConfigureMounts`          | the catalogue, `foldIntoGroup`, the mount list's writer   |

**Reads are `IQuery`, writes are `ICommand`; prefer them in a new widget.** A query over `z.array(...)`
takes the input every list takes (`where`, `sort`, `offset`, `limit`); any other query takes none
and arrives as its value. A bare `IQuery` is refused: it needs `IQuery.expects(schema)`. **A query is named
`get` and what it reads**, booleans included: `getTasks` (a list is plural), `getYear`, `getIsRound`.
A value query is renamed where it is drawn, `({ getYear: year })`, so the body reads the value. A
prop renamed from an older name keeps it in metadata, `getTasks: { aka: ["tasks"] }`, so a tile bound
before still finds its binding. A command is named for the action: `move`, `create`. A command returns only
a status, never data: its promise settles after every query of the tile has re-read, so the next
frame draws the change. A create carries its own `id: z.uuid()`, minted at the press, and a retry
with that id writes nothing. Ask `move.can()` before drawing the control, and draw `reason` when it
answers `ok: false`. The person picks what runs a command in the Actions group of the settings
window; `metadata.props.<command>.source = { implementation, fields }` names the default, with
`fields` naming sibling props, so a toggle works with nothing set up. A command with neither runs
`@core/console-log`: it prints the tile, the command and what was sent to the console and changes
nothing, the way an unbound query shows its typed default.

**A widget expects and sends; an implementation returns and takes.** `IQuery.expects` and
`ICommand.sends` are the only words a widget declares with. An implementation extends
`IQuery.returns(S)` for one shape, `IQuery.returnsAny(B)` for any shape within the bound `B` (a folder
returns any list of objects: `IQuery.returnsAny(z.array(z.object({})))`), and `ICommand.takes(S)`. A
word on the wrong side is refused with the word that fits. An implementation class is named
`*Query` or `*Command`.

**The schema is the type and the default.** A value's schema must carry `.default()`; one without is
refused. The built-in gateways check what they read against the schema through `context.parse`: a
record that does not fit is left out, a value that does not fit is drawn as the default, and both
are reported on the red "!" beside the prop in the settings window — so a widget never receives a
value its schema refuses, and needs no fallback of its own. `useData` answers `data`, never a list
of refused rows. A fixed set of choices is `z.enum([...]).default(...)`: its values become the
options a person picks from, and metadata `options` beside it may add labels but must name exactly
the same values. A row schema is `VaultRecordSchema.extend({...})` for notes, or any `z.object`; `ref` in
it is typed `RecordRef` or left out.

**A field's other names live in the schema.** `done: z.boolean().optional().meta({ aka: ["complete"] })`
lets a note holding `complete:` answer for `done`. An `aka` maps a field only when the record has no
field of its own name, and it is a list: `aka: "complete"` does not compile.

**`.pick(...)` is the widget asking; `allow` on the tile is the person answering.** Without `.pick`
a gateway has every method of its interface; with it, only the ones named, reads included, so a
collection that reads and writes picks `"list"` beside its writes. A value picked only `"get"` arrives
as the plain value. A verb not picked does not exist on the gateway at compile time. A collection that picked
`create` also has `createMany`, `update` has `updateMany`, `remove` has `removeMany`, and `create`
with `update` has `upsert({ ref, data })`: each answers `{ done, failed }` and never stops at the
first failure.

**A value takes no options in `.of()`; its metadata names the source it starts from.** The widget
never picks a row or falls back itself: `props.<name>.source` names a host implementation, and that
implementation does the picking. Sibling props are named by their prop name:

```tsx
const props = defineProps({
	tabs: IListGateway.of(TabSchema),
	selection: IValueGateway.of(z.unknown()).pick("get", "update"),
	board: IValueGateway.of(BoardSchema).pick("get"),
});

export const metadata = defineMetadata(props, {
	title: "Board",
	description: "…",
	props: {
		selection: {
			source: {
				implementation: "@core/selection",
				fields: { rows: "tabs", field: "name", whenNothingPicked: "first" },
			},
		},
		board: {
			source: {
				implementation: "@core/selected-row",
				fields: { rows: "tabs", picked: "selection", field: "name", whenNothingPicked: "first" },
			},
		},
	},
});
```

`@core/selection` is which row of `rows` is chosen, kept while the screen is open; `field` (or
`fieldFrom`, a prop holding the field's name) says which field of the row it holds, and
`whenNothingPicked` is `"none"` unless written. `@core/selected-row` is the row that `picked` names;
its `whenNothingPicked` is `"first"` unless written. `of()` given options for a value is refused.
`keep: "screen"` in the prop's metadata, `props: { open: { keep: "screen" } }`, makes a value a fact
about this screen that never reaches the note.

**An own verb is not declarable yet.** `pick` refuses a verb its interface does not have, and a
class extending the declared one is refused as an implementation. Compose the verbs you picked
inside the widget instead: `const finish = (ref) => tasks.update({ ref, data: { done: true } })`.

**The component is an ordinary one.** `<Checklist heading="Today" entries={[{ title: "Write" }]} />`
draws outside the board too: an implementation passed in is used as it stands, and a plain value or
array is handed to the interface's default implementation — `RowsInMemoryGateway` for a list,
`ValueInMemoryGateway` for a value — so a write to it lands. An interface of your own names its own
default, and one lacking a verb of the interface is refused:

```tsx
defineDefaultImplementation(IBoardsGateway, BoardsInMemoryGateway);
```

Every implementation is constructed `new XGateway(fields, context)`: `fields` are what the person or
the code gave, `context` is what the engine hands over. `context.parse(held, { label, ref })` checks
a record against the widget's schema and answers it parsed, or `null` after reporting it;
`context.report({ label, ref, issues })` reports anything else. Reports show as the red "!" beside
the prop in the settings window; the widget never sees them.

### Metadata is what a person reads

`title`, `description` (the one question the widget answers), `keywords`, `preview` (sample props the
catalogue card draws with), and per prop:

| Key             | Means                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `label`, `hint` | what the settings window shows; `label` is read off the key when not written                                                                                                                           |
| `describes`     | for a collection: the row's fields. A string is a label; an object may carry `label`, `hint`, `type`, `many`, `required`. A field's `aka` belongs to the schema, and `describes` naming one is refused |
| `aka`           | every name this prop had before, newest last                                                                                                                                                           |
| `control`       | only when the type does not say how to draw it: `text`, `emoji`, `icon`                                                                                                                                |
| `options`       | the answers a person picks between: `[{ value, label }]`                                                                                                                                               |
| `design`        | the prop belongs on the Design tab                                                                                                                                                                     |
| `wants`         | the other widget's prop this one is usually bound to                                                                                                                                                   |
| `source`        | where a value starts from: `{ implementation: "@core/selection" \| "@core/selected-row", fields }`, the host implementation that picks the row                                                         |
| `isVisible`     | a function over every prop, answering whether the settings window draws this one                                                                                                                       |

Metadata naming a prop `inject` does not declare, or one the engine hands over, is refused.

**`isVisible` is how one switch changes what the window asks for.** It is handed every prop as
`{ kind, control, binding, isSet, value }` for a value and `{ ..., rows }` for a collection, reading
what the person typed and falling back to the default. It works on a slot or a mount too. A rule that
throws draws the thing it would have hidden and says so in the console. The function is code, so
`manifest.generated.json` does not carry it.

**A choice is `options`, never a second prop holding the answers.** A `source` binds a prop to a box the
widget fills — a tab pressed, a card opened — and a box draws nothing in the settings window.

### Layout is where it stands

- `role` — required, and one. A widget drawing two roles (a figure and its rows) is two widgets —
  `brief.md` law 14.
- `size` — required. **`preferredWidth` and `preferredHeight` are the size the widget prefers, never
  a size it is promised.** The width is a ceiling the cell narrows under, `"full"` takes the whole
  cell; the height is where a short widget is drawn to, and one with more to draw grows past it,
  `"auto"` is as tall as it draws. `keepsRatio: true` holds height to width. `at` steps by the width
  of the **region**, never the screen: `at: [{ belowPx: 520, preferredWidth: "full" }]`.
  `collapseBelowPx` and `stackBelowPx` are the floors a row stacks and a widget collapses at. Use
  `useNarrowed`, never a media query.
- `inline: true` — a widget that stands in text; declare `IContent` and `IReader`.

### A migration, when tiles cannot follow alone

```tsx
export const migrations = defineMigrations([
	{
		from: { label: IValueGateway.of(z.string().default("")).pick("get") },
		run: (old) => ({ label: { from: "typed", value: String(old.label?.value ?? "").length } }),
	},
]);
```

`from` is the props as an older version declared them; a tile made with exactly those moves by a
press, through `run`.

### A default is never a path

**A default never names a file or a folder, at any depth, under any spelling. This is a security
law.** A path in a default would let a widget read a person's notes before they chose anything, or
delete files on first render. `path` or `ref` in a default — in an object, in an array's rows, or
nested inside either — is refused, and renaming the field is not a fix.

## Reading and writing

```tsx
const { data, total } = useData(entries.list); // data is always an array
const page = useData(entries.list, { offset: 20, limit: 10 });
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

The kit carries the hooks widgets kept copying. `usePages(source, size)` and `useShown(source, size)`
count pages or rows and start over when the source changes; `useWhenSeen(onSeen)` and
`<MoreWhenSeen onSeen className/>` load the next page 400px before the end is on screen.
`useRendersMarkdownInto(host, markdown, path)` and `<RenderedMarkdown host markdown path className
plainClassName part/>` draw markdown through the host, as plain text where it cannot; pass the note's
path whenever you have one, or a relative link has no note to resolve from. `useNow(tickMs, isTicking)`
is a clock, `useScrollFog(ref, onEdges, watched)` hands over how far a box is scrolled from each edge,
`<Line tone text/>` and `<Ceiling total tone/>` are a status line and the "first 500 of N counted"
line under `COUNTED_CEILING`, `<Flame size className/>` is the streak flame (`FLAME` its path) and
`<DiffBar added removed className/>` the added-against-removed bar.

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

## Before you say it is done

- `check <id>` exits 0.
- It draws with real vault data bound, not typed defaults.
- It survives an empty collection and a failed read with something readable.
- Its `keywords` would find it.
