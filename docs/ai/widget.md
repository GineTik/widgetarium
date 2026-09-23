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
	<Emblem.Image src={person.photo} />
	<Emblem.Fallback seed={person.name} />
</Emblem>

<Emblem size="l" shape="rounded" label={project.title}>
	<Emblem.DiceBear style="shapes" seed={project.ref} options={{ backgroundColor: ["b6e3f4"] }} />
	<Emblem.Fallback seed={project.title} />
</Emblem>
```

`size` is `s` (24), `m` (40), `l` (64), `xl` (96) or a number; `shape` is `circle`, `rounded` or
`square`; `label` is what a screen reader reads. `Emblem.Fallback` stands until the picture has
loaded and wherever it failed; with no children it draws the `PlaceholderMark` below.

**Where the picture comes from, in this order:**

1. What the person gave — a file they named, an address in a note, a picture already in the vault.
   Only when they ask for one on their machine do you read it from there.
2. A field of the record that already holds a picture.
3. Otherwise `Emblem.DiceBear`, chosen for what the thing is. `style` is a DiceBear style name,
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
