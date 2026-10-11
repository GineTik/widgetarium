# Writing a widget

Only when `find` offers nothing close. A near neighbour with different controls beats a new widget.

**One widget draws one thing.** A total with its bar, a chart, a list of rows: each is a widget of
its own, and a section places them together. When the design asks for a figure over a list, write
two widgets reading the same query, never one that draws both.

## The project

`widgetarium.json` at the project's root names where each layer lives. The defaults:

```
src/app/routes/<route>/board.json      one board per route
src/widgets/**/widget.tsx              a widget, at any depth; its folder is the widget
src/logic/<feature>/                   the feature's queries and commands
src/shared/schemas/                    zod schemas widgets and handlers both import
src/shared/sources/<pack>/             ready generic handlers: folders, notes, statistics, git
src/shared/kit/                        the kit, copied in; items found by name, every name unique
src/shared/libs/<library>/             third-party code the project keeps
docs/                                  the spec, the design, the references
```

Only `app.name` is required: `{ "app": { "name": "shop" }, "paths": { "widgets": "src/ui/widgets" } }`
moves one layer and keeps the rest; a path is relative to the root, never `..`. `app` is the app's
one name and its icon, `public/icon.svg` by default: the Vite plugin writes both into the page's
title, `application-name` and favicon, and `@widgetarium/core/app` hands them to the running app as
`project.app`, `{ name, iconHref }`. `@kit`, `@schemas`, `@libs`, `@logic`
and `@widgets` point at their paths, and `aliases` adds to them. Discovery skips `node_modules`, `build`, `dist` and every dot-folder, and these
names must be unique across the project:

- **a widget** is its folder's name; a folder holding `widget.tsx` is a widget and its subfolders are
  its own modules, never other widgets.
- **a kit item** is a `.ts` or `.tsx` file's name anywhere under the kit, except `index.ts`, tests,
  `.d.ts` and files under `utils/`, `hooks/` or `constants/`, which are helpers.
- **a handler** is an exported class under `logic` or `sources` extending `IQuery…` or `ICommand…`.
- **a schema** is an exported `*Schema` const under `schemas`; a re-export does not count twice.
- **a route** is a folder under `routes` holding `board.json`: `index` adds nothing to the path,
  `[id]` becomes `:id`, and `layout.board.json` beside it is that folder's layout.

**Imports point down only: app → widgets → logic → shared.** A widget never imports a handler and a
handler never imports a widget; both import the schema in `src/shared/schemas`, which is where they
meet. A feature handler holds the business rules and maps a ready source to the shape a widget asks
for, so a widget draws states and formats values, and never filters, maps fields or picks a row.

**A widget from the catalogue is a starting point, not a dependency.** After adding it, move its
schema into `src/shared/schemas` or map the project's records to it in a feature handler, and
refactor it to the project like code of your own.

In a project the catalogue is reached through the `widgetarium` CLI (catalogue.md has the whole of it):

```bash
widgetarium catalogue search "tasks by day"
widgetarium catalogue show @default/table
widgetarium add @default/table
```

`add` copies the folder into `src/widgets/<name>/`, the scope's lib into `src/shared/libs/<library>/`
with its imports moved onto `@libs`, and writes `origin.json` beside it. In a vault,
`node {tool} find`, `show` and `install` (tools.md) do the same.

### Where a project runs

**In a browser**, `npm run dev`: the Vite plugin reads the project and `@widgetarium/core/app` draws the
board of the route matching the address. A widget moves between routes with
`navigator.navigate("/tasks/42")`; a link no route answers is refused. A route folder `[id]` matches
any one segment, and a static segment wins over a parameter. The matched `id` is a page parameter:
a widget reads it through a prop bound to `{ implementation: "@core/page-param", fields: { key: "id" } }`,
like any parameter handed over by a press.

**In Obsidian**, a code block in any note draws one route of a project in the vault:

````md
```widgetarium-app
app: Apps/Shop
route: /tasks/42
```
````

`route` defaults to `/`. Saving any file under the folder redraws the block. A project that does
not check draws its findings in the block instead of a board.

**The kit differs between the two for now.** In a browser the project draws with its own copy in
`src/shared/kit`; inside Obsidian its widgets draw with the plugin's kit, so a change to the copy
shows only in the browser.

## The folder

A widget folder holds `widget.tsx`, or `widget.ts` when it draws no JSX, and any `.ts` or `.tsx`
modules it imports relatively, nested folders included. A `widget.jsx` or `widget.js` is refused and
draws the rename that fixes it. The engine compiles everything into `build/` beside it: **never write
anything in `build/`.** Save and it appears — no publish, no reload. The plugin lays `tsconfig.json`
and `types/` beside the widgets so an editor types every port instead of handing you `any`.

## Ports: what a widget reads and writes

**Data reaches a widget only through `IQuery` and `ICommand`**, declared in `createWidget({ inject })`:

| Declared in `inject`            | Is                                       | Used as                                     |
| ------------------------------- | ---------------------------------------- | ------------------------------------------- |
| `IQuery.output(S)`              | a value or a setting; takes no input     | arrives as the value: `({ getYear: year })` |
| `IQuery.input(I).output(O)`     | a query with a typed input               | `useData(getTasks, input)`                  |
| `ICommand.input(I).output(O)`   | a command answering data                 | `await createTask(input)`                   |
| `ICommand.input(I)`, `ICommand` | answering nothing; bare, no input either | `await archive(input)`, `await refresh()`   |

**The same builder after `extends` is a handler; position decides.** In `inject` it is the port the
widget needs; `class TasksQuery extends IQuery.input(I).output(O)` is the code that answers it:

```ts skip-check
class TasksQuery extends IQuery.input(TasksInputSchema).output(PageOf(TaskSchema)) {
	async query(input: TasksInput, ctx: HandlerContext): Promise<TaskPage> { … }
}

class SaveTaskCommand extends ICommand.input(TaskSchema).output(TaskSchema) {
	async run(input: Task, ctx: HandlerContext): Promise<Task> { … }
}
```

`ctx` is `{ user, signal, host }`: who asked, the signal that cancels a read nobody waits for, and the
host. A handler is named `*Query` or `*Command` and registered in a pack under an id the board binds.

**Naming.** A query is `get` and what it reads: `getTasks` (a list is plural), `getYear`,
`getIsRound`; a value query is renamed where it is drawn, `({ getYear: year })`. A command is named for
the action: `createTask`, `move`.

### Lists are pages

A query that answers rows answers `PageOf(RowSchema)` and takes `PageInputSchema`:

| Schema              | Shape                                                       |
| ------------------- | ----------------------------------------------------------- |
| `PageInputSchema`   | `{ cursor?: string \| null, limit: number }`, `limit` ≤ 100 |
| `PageOf(RowSchema)` | `{ items: Row[], next: string \| null, total?: number }`    |

Their types are `PageInput` and `Page<Row>`. The engine knows a `PageOf` output: a read that names no
`limit` gets a hundred rows, a `limit` the widget names is honoured, it asks for the next page with `next`, and hands the widget the items with `hasMore` and
`more`. **Anything that draws rows paginates**, from the first row. A page may come
back shorter than `limit`; only `next` says whether more exist.

**A filter is a plain field of the input**, usually picked from the record's shared schema:
`PageInputSchema.extend(TaskSchema.pick({ status: true }).partial().shape)`. A handler's input schema is
what it can serve: a widget asking for a field the handler's input lacks is never bound to it.

### Reading and writing

```ts skip-check
const { data, total, isLoading, failure, hasMore, more } = useData(getTasks, { status, limit: 20 });
const answer = await createTask({ id: crypto.randomUUID(), title, due: null });
```

`useData(query, input)` over a page answers `{ data, total, hasMore, more, isLoading, failure }`:
`data` is the items read so far, `hasMore` is true while the last page had a `next`, and `more()`
appends the next page. **Read a query inside the widget that draws it**:
read a level up and passed down, a correct value draws a stale screen.

A command answers `{ ok: true, output }` or `{ ok: false, reason, ran }` and never throws. Draw
`reason`. **`ran: true` means the write happened and only its output was refused: never send it
again.** A create carries its own `id: z.uuid()`, minted at the press, so a retry with the same id
writes nothing twice. The command settles after every query of the tile has re-read, so the next frame
draws the change.

### Schemas

- **An output schema describes shape only.** No `transform` or `pipe`: an output is parsed by the
  handler and again by the widget, so it must parse to itself. `.default` and `.catch` are allowed.
- **A rule belongs to the input of the command that writes**: `title: z.string().min(1)` stands in
  the command's input, never in a shape that is read.
- **A value is parsed strictly**, and a failure names its exact path. A field that should fall back
  instead of failing says so with `.catch(...)`. A value query's schema carries `.default()`.
- A fixed set of choices is `z.enum([...]).default(...)`; its values are the options a person picks.
- **`aka` names the properties a hand-written note may use for a field**:
  `done: z.boolean().optional().meta({ aka: ["complete"] })` lets a note holding `complete:` answer
  for `done`, only when the note has no `done` of its own. It is a list, and it is nothing else.

### What the host hands over

| Declared                                         | Arrives as                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `hero: ISlot`                                    | a component: `<Hero />` draws the widget placed there, nothing when empty         |
| `main: ISlot.array()`                            | components: `main.map((Slot) => <Slot key={Slot.id} />)`, `main.length`           |
| `IRepeat.of<Given>({ default, surface, gives })` | a function drawing one widget again for every row, or `null`                      |
| `IHost`, `INavigator`, `IHere`                   | the host, navigation, the note it stands in                                       |
| `IReader`, `IContent`                            | the passage and its reader, for an `inline` widget                                |
| `ICatalogue`, `ICarrier`, `IPreview`             | the sidebar catalogue's pick, a drag the host runs, any widget drawn as a preview |

## A whole widget

`createWidget({ inject, draw })` declares and draws; `defineMetadata` describes it for a person;
`defineLayout` places it; `defineStates` holds its sample data, one entry per look. `examples.md` has
a list widget and a form widget whole; their shape:

```tsx
import { IQuery, createWidget, defineLayout, defineMetadata, defineStates } from "widgetarium";
import { Card } from "widgetarium/kit";
import { z } from "zod";

const Clock = createWidget({
	inject: {
		getZone: IQuery.output(z.string().default("UTC")),
	},
	draw: ({ getZone: zone }) => <Card>{new Date().toLocaleTimeString("en-GB", { timeZone: zone })}</Card>,
});

export const metadata = defineMetadata(Clock, {
	title: "Clock",
	description: "The time in one zone.",
	keywords: ["clock", "time", "zone"],
	props: { getZone: { label: "Time zone", hint: "An IANA zone, such as Europe/Kyiv." } },
});

export const layout = defineLayout({ role: "indicator", size: { preferredWidth: 240, preferredHeight: "auto" } });

export const states = defineStates(Clock, { Kyiv: { getZone: "Europe/Kyiv" } });

export default Clock;
```

Never annotate `inject` or `draw` with a type: that erases what the component is typed from. Code
outside `draw` takes the ports' types from the widget, `PropsOf<typeof Clock>`. The component is an
ordinary one: `<Clock getZone="Asia/Tokyo" />` draws outside a board too, a plain value standing for
the query's answer.

**`states` are the widget's sample data**, never `draw`: `Full` with real rows, `Empty` always, and any
other look it has. A paged query's state is its rows, a plain array: `getTasks: [{ … }]`, never
`{ items, next }`. The design canvas draws the widget once per state; `check` names a widget without
them.

### Metadata is what a person reads

`title`, `description` (the one question the widget answers), `keywords`, `preview`, and per prop:

| Key             | Means                                                                            |
| --------------- | -------------------------------------------------------------------------------- |
| `label`, `hint` | the field's name; one short sentence behind its (?) button                       |
| `aka`           | every name this prop had before, newest last, so an older tile finds its binding |
| `control`       | only when the type does not say how to draw it: `text`, `emoji`, `icon`          |
| `options`       | labels for an enum's values: `[{ value, label }]`, the same values as the enum   |
| `design`        | the prop belongs on the Design tab                                               |
| `source`        | the handler a prop starts from: `{ implementation, fields }`                     |
| `keep`          | `"screen"`: the value is a fact about this screen and never reaches the note     |
| `isVisible`     | a function over every prop, answering whether the settings window draws this one |

**`source` is how a widget works with nothing set up.** `@core/selection` is which row of a sibling's
rows is chosen; `@core/selected-row` is the row it names; a command's `source` names the handler it
runs by default, `@core/value-set` over a sibling value for a toggle. `fields` name siblings by prop
name. A command with neither a binding nor a source runs `@core/console-log`, which prints what was
sent and changes nothing.

### State shared by name, never by another widget

| Binding                                                                  | Holds                                                       |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `{ implementation: "@core/screen-state", fields: { key: "home.view" } }` | a value every widget naming the key shares, until it closes |
| `{ implementation: "@core/page-param", fields: { key: "project" } }`     | what the press that opened this page handed over            |
| `{ implementation: "@core/today" }`                                      | today's date, `YYYY-MM-DD`, turning over at midnight        |

**A page opened for a record says which one in the press**:
`navigator.navigate("Project", { params: { project: project.id } })`, and the page's widgets read it
through `@core/page-param`. A page opened another way has no project and draws that state. Never write
a timestamp into a record to remember which one was opened.

### Layout is where it stands

- `role` — required, and one. A widget drawing two roles is two widgets (brief law 14).
- `size` — required. `preferredWidth` (pixels or `"full"`) and `preferredHeight` (pixels or `"auto"`)
  are what it prefers, never what it is promised; `keepsRatio` holds height to width; `at` steps by the
  width of the **region**: `at: [{ belowPx: 520, preferredWidth: "full" }]`. In a page's slots they are
  ignored. Use `useNarrowed`, never a media query.
- `inline: true` — a widget that stands in text; declare `IContent` and `IReader`.

### A migration, when tiles cannot follow alone

```ts skip-check
export const migrations = defineMigrations([
	{
		from: { label: IQuery.output(z.string().default("")) },
		run: (old) => ({ getLabel: old.label }),
	},
]);
```

`from` is the ports as an older version declared them; a tile made with exactly those moves by a
press, through `run`.

### A default is never a path

**A default never names a file or a folder, at any depth, under any spelling. This is a security
law.** A path in a default would let a widget read a person's notes before they chose anything.
`path` or `ref` in a default is refused, and renaming the field is not a fix.

## A page widget

A page is one `layout` widget, `@<app>/<page>-page`. Its code decides where each block stands; the
blocks stand in slots a person fills and swaps without code. It reads data **only to choose which
slots show**:

```tsx
import {
	IQuery,
	ISlot,
	PageInputSchema,
	PageOf,
	createWidget,
	defineLayout,
	defineMetadata,
	defineStates,
	useData,
	z,
} from "widgetarium";
import { Container } from "widgetarium/kit";

const PersonSchema = z.object({ id: z.uuid(), name: z.string() });

const PeoplePage = createWidget({
	inject: {
		getPeople: IQuery.input(PageInputSchema).output(PageOf(PersonSchema)),
		hero: ISlot,
		main: ISlot.array(),
		empty: ISlot,
	},
	draw: ({ getPeople, hero: Hero, main, empty: Empty }) => {
		const isEmpty = useData(getPeople, { limit: 1 }).data.length === 0;
		return (
			<Container width={1040} data-name="People">
				<div className="flex flex-col gap-sections" data-name="Slots">
					<Hero />
					{isEmpty ? <Empty /> : main.map((Slot) => <Slot key={Slot.id} />)}
				</div>
			</Container>
		);
	},
});

export const metadata = defineMetadata(PeoplePage, { title: "People", description: "Everyone, and who is due." });

export const layout = defineLayout({ role: "layout", size: { preferredWidth: "full", preferredHeight: "auto" } });

export const states = defineStates(PeoplePage, {
	Full: {
		getPeople: [{ id: "0b6c4c1e-2f1a-4c8e-9d3b-5a7e1f2c3d40", name: "Sofia Marin" }],
		hero: { widget: "@crm/people-hero", state: "Full" },
		main: [{ widget: "@default/section", props: { getHeading: "Reach out" } }],
	},
	Empty: { getPeople: [], empty: { widget: "@default/empty-state" } },
});

export default PeoplePage;
```

A slot in a state names a widget and one of its states, or hands it `props`. The page's body frame is
the kit's `Container` (`width` 640, 800, 1040, 1280 or `full`); inside it rows and grids are Tailwind
answering to their own width (`@3xl:grid-cols-[2fr_1fr]`). Space blocks with `gap-sections`, items
with `gap-cards`, and name every group a person might move things between with `data-name`. A block
that needs a title stands in `@default/section`; a widget that draws rows draws no title of its own.

## Spacing inside a widget

Never write a gap as a number. Every cell carries `var(--wg-gap-items)` (bare items, sections),
`var(--wg-gap-parts)` (the parts of one item) and `var(--wg-gap-cards)` (items that each wear a plate);
Tailwind names them `gap-items`, `gap-parts`, `gap-cards`. `SlotList` from the kit picks the right one.

## A picture: `Emblem`

Every picture that stands for something — a person, a company, a project, a place — is an `Emblem`:
one component whether it ends up reading as an avatar, a logo or a mark.

```tsx skip-check
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

## Shapes: the objects that keep a quiet page alive

`<Shape name="cookie9-sided" tones={["yellow", "orange"]} size={64}/>` from `widgetarium/kit` draws
one of the 35 Material 3 Expressive shapes as a lit 3D object — a highlight on the side facing the
light, shading opposite, a soft shadow — painted from kit colour tones. `SHAPE_NAMES` lists them:
`circle`, `square`, `slanted`, `arch`, `fan`, `arrow`, `semi-circle`, `oval`, `pill`, `triangle`,
`diamond`, `clam-shell`, `pentagon`, `gem`, `sunny`, `very-sunny`, `cookie4-sided` to
`cookie12-sided`, `ghostish`, `clover4-leaf`, `clover8-leaf`, `burst`, `soft-burst`, `boom`,
`soft-boom`, `flower`, `puffy`, `puffy-diamond`, `pixel-circle`, `pixel-triangle`, `bun`, `heart`.

- `tones` are kit colour names: the first is the body, the second the light side.
- `seed={record.title}` instead of `name` picks a shape and a tone from the seed, the same every time.
- Children sit in the middle: `<Shape name="cookie9-sided" tones={["yellow", "orange"]}>€</Shape>`.
- Changing `name` morphs it into the new shape, light and colour included.
- `look="flat"` draws it without light.

`<PhotoStack photos={[a, b, c]} size={56}/>` overlaps photos at a card's corner; `isRound` for faces.

Recipes: a key number stands on a shape that means it (money on a `cookie9-sided` coin, a count on a
`circle`, a place on a `pentagon`); a record without a picture wears `<Shape seed={record.title}/>`;
an empty state is one large shape with two or three small ones around it, its title and one action
under it; each kind of thing owns one tone everywhere it appears.

## A badge, a heading, a "show more", a progress bar

Take these from `widgetarium/kit` rather than drawing them:

```tsx skip-check
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

```tsx skip-check
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
  (Popover, Select, SidebarSheet), `month` / `defaultMonth` / `onMonthChange` (Calendar),
  `pressed` / `defaultPressed` / `onPressedChange` (Toggle), `value` as an array (Slider). Pass the
  first to control it, the second to let it hold its own. `Calendar` takes `selected` / `onSelect`
  in shadcn's `mode="single" | "multiple" | "range"`.
- **A form is `useForm` plus `Controller`**, shadcn's React Hook Form example with the kit's own hook:
  `useForm({ schema, defaultValues })`, `<Controller name control={form.control} render={({ field,
fieldState }) => …} />`, `form.handleSubmit(send)`. The schema is your zod object; the kit only calls
  its `safeParse`. The whole pattern and the Bug report example are in `kit.md`, "Inputs, calendar,
  forms".
- **`asChild`** on `Button`, `IconButton`, `Badge`, `Card`, `Plate`, `List`, `Row`, `Sidebar` and
  `PopoverTrigger` draws the kit's look and behaviour on your own element — an `<a>` that is a
  button, a row that is a link. Props merge the Radix way: yours win, both click handlers run.
- **Keyboard comes built in**: arrows and Home/End in `Segmented`, in an open Popover's items and
  in `Calendar` (PageUp/PageDown turn the month); Escape closes a Popover and hands focus back.
- **State is on the element**: `data-state="open|closed|checked|unchecked|active|inactive"`,
  `data-disabled`, `data-highlighted`, `data-loading`, `data-selected`, `data-today`.
- An open `PopoverContent`, menu, tooltip or hover card carries `--wg-kit-anchor-width`,
  `--wg-kit-pop-available-width`, `--wg-kit-pop-available-height` and `--wg-kit-pop-origin`, and
  `data-side`/`data-align` for where it landed, so content can match its trigger and stop at the
  screen's edge in plain CSS.

## A table, its pages, and a skeleton

Rows are drawn by `DataTable`, the way shadcn pairs a data table with its table parts, except that
it is the kit's own component rather than code you copy, so how every table behaves changes in one
place:

```tsx skip-check
const read = useData(getInvoices, { limit: 20, sortBy: sort?.key, direction: sort?.direction });

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
/>;
{
	read.more ? <ShowMore isLoading={read.isLoading} onMore={read.more} /> : null;
}
```

- A column's `type` (`text`, `number`, `date`) aligns its head and its cells together; `number`
  and `date` stand at the end. `align` overrides it.
- A cell shows `row[key]`, a number written for a person and a dash for nothing. `render(row)`
  draws anything else in it — a kit component, one of the widget's own, or markup of its own.
- `onSortChange` makes every head a sort button, and `sortable: false` takes one out. The table
  only asks for an order, `{ key, direction }`; the order is a field of the query's input and the
  handler sorts, because a table sorting its own rows would sort one page of a hundred.
- `onSelect(key, row)` makes a row pressable by pointer and keyboard; `selected` marks it. A row's
  key is its `ref`, else its `id`, else its place — `rowKey(row, index)` names another.
- `rowProps(row)` puts a class, a handler or a `data-*` on a row.
- `isLoading` with no rows draws skeleton rows, `failure` a sentence in the error tone, and no rows
  the `empty` sentence. `page`, `count` and `onPageChange` draw the kit's `Pagination` under it.

A table `DataTable` cannot draw — cells spanning columns, rows in groups — is built from the parts.
They are shadcn's, and a table scrolls sideways inside its own box when its columns are wider than
the region. There are no cards for a narrow region: the table stays a table.

```tsx skip-check
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

```tsx skip-check
<Pagination page={page} count={count} onPageChange={setPage} />
```

It draws the first and last page, the current one with `siblings` on each side (1 by default), and
a gap wherever pages were left out. `variant="compact"` draws `‹ 3 / 20 ›` instead, and a full one
turns compact by itself in a widget narrower than 360px. `defaultPage` in place of `page` keeps the
page inside the pagination. One page or none draws nothing.

Reach for the parts only for a pagination the ready one cannot draw. They are shadcn's, and
`paginationItems(page, count, siblings)` says which pages to lay out, with `{ kind: "gap" }` where
pages were left out:

```tsx skip-check
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

A query's pages are read forward with `more`, so `ShowMore` is the answer for a list that grows as it
is read; numbered pages need `total` from the handler and a cursor per page, kept by the widget.

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

```tsx skip-check
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

```tsx skip-check
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

## Styling is Tailwind, written in the TSX

A widget is styled with Tailwind classes on its elements, and its `widget.css` only opens Tailwind
and the kit's theme; `check` refuses a rule written beside them. Tailwind replaces CSS and nothing
else: every colour is still the kit's. The look then lives beside the markup it styles, and nothing is left to keep in step
in a second file:

```css
@import "tailwindcss";
@import "widgetarium/theme.css";
```

A scope may add a `theme.css` of its own, imported third, and a `@theme` of yours comes last:

```css
@import "tailwindcss";
@import "widgetarium/theme.css";
@import "../theme.css";

@theme {
	--color-brand: oklch(0.72 0.11 221);
}
```

The kit's theme names every token as a Tailwind one, shadcn's names and the kit's own —
`bg-card`, `bg-muted`, `text-muted-foreground`, `text-brand`, `bg-group`, `bg-fill`, `rounded-plate`,
`rounded-pill`, `text-sm`, `text-h3`, `gap-cards`, `p-plate` — so you repeat no variable. A scope file beside your widgets carries what all of them share, and a `@theme`
of your own comes last and wins: add a colour, or change one of the kit's for this widget alone
(`--radius-plate: 18px`). `--color-*: initial` drops a whole namespace, `--*: initial` starts from
nothing.

Style a kit control's state with Tailwind's data variants — `data-[state=open]:bg-group`,
`data-[highlighted]:bg-fill` — and join classes with `cn` from `widgetarium/kit`: it is shadcn's,
so a class you pass wins a conflict with the kit's own (`cn("p-plate", "p-2")` is `p-2`), and it
knows the theme's names, so `text-h3 text-muted-foreground` keeps both.

`@plugin` and `@config` load JavaScript and are refused; `@utility` and `@custom-variant` are not.
Preflight is refused too, and so is every other name under `widgetarium/`. Tailwind 3's entry points
(`@tailwind base`, `@import "tailwindcss/utilities"`) compile to nothing here, and `check` names them.
A colour from Tailwind's own palette — `bg-violet-500`, `text-white` — is refused by `check` like a
hex: no theme repaints it. Never restyle a kit component through its `className`; a look the kit
lacks is a variant the kit gains.

## A plate inside a widget

**Draw no background, border, corner or shadow of your own.** The engine draws the root — container
query, size, clipping — the board decides the tile's plate, and every plate you paint under it comes
from `widgetarium/kit`:

```tsx skip-check
<Card>…</Card>
<Card tone="warning">…</Card>
<ItemGroup>{rows.map((row) => <LayoutItem key={row.ref}>…</LayoutItem>)}</ItemGroup>
<Grid min={220}>{cards.map((card) => <LayoutItem key={card.ref}>…</LayoutItem>)}</Grid>
<Card type="apart" side="start" across="column">…</Card>
```

One block goes in `Card`, rows of data in `ItemGroup`, a grid of things in `Grid`. The rules they
follow are in [surfaces.md](surfaces.md).

- `Card` is one plate: `type` `group` by default, `none` paints nothing, `apart` is a line taking
  `side` and `across`; `tone` is any kit tone.
- `ItemGroup` is a list with no plate: its `LayoutItem`s or `Item`s stand on the page with a hairline
  between them. A list that needs a plate goes inside a `Card`.
- `LayoutHeader` is a line of its own: `LayoutTitle` (an `h3`) and `LayoutActions` (anything at the
  end of the line; `ActionButton` is the small grey one).
- `Grid` is bare; every `LayoutItem` is a `Card`. `min` is the narrowest a cell may be before it wraps.
- `Layout kind` is `stack`, `row` or `grid`, and `LayoutItem` becomes what the kind asks for.

**The laws decide it, not you.** Two plates stand from the region, the tile's own included, so a
tile already wearing a `group` leaves you one plate and the next is refused: it paints nothing and
says why in the console. A `kind`, `type`, `tone`, `side` or `across` the kit never had is refused
the same way — the default is drawn and the console names what it took instead.

## Before you say it is done

- `check <id>` exits 0.
- It draws with real vault data bound, not typed defaults.
- It survives an empty collection and a failed read with something readable.
- Its `keywords` would find it.
