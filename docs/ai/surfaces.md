# Surfaces

Three words, and most of the screen wears the first.

| `surface`         | Paints                                        |
| ----------------- | --------------------------------------------- |
| absent, or `none` | nothing                                       |
| `apart`           | one 1px line on one side, no plate, no corner |
| `group`           | a plate: a faint grey, no edge                |

**The page is white and a plate is a light grey on it.** A `group` on another `group` turns white, so
it still reads against the grey it stands on. A plate is never outlined.

## The rules

1. **A set gets plates; a single thing stands bare.** Headings, prose, a chart, a graph, one block in
   the middle of the page: no plate.
2. **A grid gives every cell its own plate**, a grid of widgets and a grid of records alike. The grid
   itself wears nothing.
3. **Rows of data stand in one plate, with a line between them.** The rows wear nothing of their own.
4. **Every widget in an `indicators` region wears a plate.** The engine lays it as the board is
   drawn, on any widget in that region that names no surface of its own, however deep its section.
   A `text`, `layout`, `control` or `navigation` widget stays bare. A `navigation` region lays
   nothing.
5. **A state replaces the grey.** `tone` paints the plate with a warning, an error, a success or the
   accent. A row in a state is washed edge to edge, and the line beside it stays.
6. **A control is not a plate.** A field, a switch, a count keep their own darker grey, so they still
   show on a plate.

Everything else you write on every node as you place it; a node you leave bare stays bare. `apart`
carries `side: start | end`, the edge the line stands on.

## Where each may stand

Read by the nearest plate above. An `apart` makes no plate and does not count.

| Nearest plate above ↓     | `group` | `apart` |
| ------------------------- | ------- | ------- |
| none — page, region, pane | yes     | yes     |
| `group`                   | yes     | yes     |

Two plates deep from the region, counting any a widget paints inside itself. A plate whose every
child wears a plate is refused.

**These three are a gate, not advice.** The Design tab greys out what they refuse, `lint` fails a
note that carries one, and a surface they refuse cannot be written at all. Read
[examples.md](examples.md) and build what the screens there build.

## Inside a widget: Card, Rows, Grid, Layout

The tile's own plate is the node's. Everything the widget paints under it comes from
`widgetarium/kit`, and the kit already follows the rules above:

```tsx
import { Card, Grid, Layout, Rows, Tabs } from "widgetarium/kit";

<Card tone="warning">3 bugs found today</Card>

<Rows>
	<Rows.Header>
		<Rows.Title>Steps</Rows.Title>
		<Rows.Actions>
			<Tabs size="s" items={views} value={view} onChange={setView} />
			<Rows.ActionButton icon="plus" label="Add a step" onClick={add} />
		</Rows.Actions>
	</Rows.Header>
	{steps.map((step) => (
		<Rows.Item key={step.ref} tone={step.done ? "success" : undefined}>…</Rows.Item>
	))}
</Rows>

<Grid min={220}>
	{albums.map((album) => <Grid.Item key={album.ref}>…</Grid.Item>)}
</Grid>

<Layout kind={kind}>
	{rows.map((row) => <Layout.Item key={row.ref}>…</Layout.Item>)}
</Layout>
```

- `Card` is one plate. `type` is `group` by default, `none` paints nothing, `apart` is a line and
  takes `side: start | end` and `across: row | column`. `tone` is `success`, `warning`, `error`,
  `accent` or any other kit tone. A card has no header or footer: what goes in it is yours.
- `Rows` is one plate; `Rows.Item` stands bare on it with a line above every item after the first.
  The plate has no side padding: each row carries the inset itself, so a line and a toned row reach
  both edges while the text stays 16px in. Rows standing on a plate already paint no second one.
- `Rows.Header` is a row standing **above** the plate, outside it, flush with its edge rather than
  inset like a row. `Rows.Title` is a kit `Heading` (an `h3` at size 4) and `Rows.Actions` holds
  what stands at the end of the line: anything at all. `Rows.ActionButton` is the quick one, a small
  grey button with an `icon`, an `icon` and words, or words alone; it is a plain button, so it is the
  `trigger` of a `Popover` or a `Dialog` as it stands. `Tabs` belong there too.
  `<Rows.Header title="…">{actions}</Rows.Header>` is the short form of the same. Only rows standing
  on a tile that is itself a plate keep the header inside, because that plate is the board's and
  nothing can stand above it.
- **Padding is never doubled.** Rows on a card take the card's padding on every edge they touch: the
  sides always, the top only when nothing stands above them in the card, the bottom only when nothing
  stands below. Anything else in the card keeps that edge for the card. The rows mark it on the card
  as `data-rows-flush="inline top bottom"` and the CSS drops exactly those edges.
- `Grid` is bare; every `Grid.Item` is a `Card`. `min` is the narrowest a cell may be before it wraps.
- `Layout` is all of them behind one word: `kind` is `stack` (bare), `row` (cards across), `grid`
  or `rows`, and `Layout.Item` becomes whatever the kind asks for. Changing the design is changing
  that one word.

**A widget that paints its own plates wants a bare node.** `@default/kanban-board` paints a plate on
every column and one on every card in it, so its tile wears **no** surface — two plates are already
spent inside. Give a node `group` only when the widget draws flat content on it.

**The same laws decide it, and the widget is not asked.** Every kit plate counts against the two
plates from the region, the tile's own included, so a `group` on the node leaves the widget one plate
and a second is refused. The refusal paints nothing and says why in the console. Corners come out
concentric with the tile's and are never written.

## Roles

A widget names `role` in its manifest. A box you build names `role` and `purpose` — `purpose` is the
one question the box answers.

```yaml
- dir: row
  role: indicators
  purpose: How the selected habit is going
  surface: group
  of: [{ id: w3 }, { id: w4 }]
```

`layout`, `navigation`, `indicator`, `indicators`, `collection`, `detail`, `composer`, `control`,
`media`, `text`. A widget without one is never given a surface.

`layout` is the section: a widget that titles a part of a region and holds what stands under it. It
is the only role besides `text` allowed to draw its own `h2`, and it wears no surface of its own —
its `arrangement` decides the plates of what stands in it, by rules 2 and 3.

## Spacing and corners are computed

Never write a gap or a radius. Children stand 24px apart in a region, 16px one box down, 8px deeper,
one step closer after a `text` widget and between repeats of one widget. Between two plates one
plate's padding comes off. Every plate is rounded concentric with the one around it and re-laid on
every change.

So a box exists only where a surface, a heading or a turn of direction makes the group visible. A box
of its parent's direction with no surface and no heading is what `lint` names a phantom. A heading is
a `role: text` tile standing first in the column, never a `name` on the box.

Inside a widget the same steps arrive as `--wg-gap-items`, `--wg-gap-parts`, `--wg-gap-cards`.

## Colour

Every colour is a `--wg-kit-*` token. A theme repaints a token and cannot repaint a hex.

- **Text** and **muted text**, two colours and no third: `--wg-kit-text` is the theme's own text
  colour, `--wg-kit-text-muted` the theme's muted colour a step toward the page, so a caption, a date
  or a secondary figure recedes instead of competing with the line above it. Never `--text-muted`
  or `--text-normal` directly.
- `--wg-kit-fill`, `--wg-kit-fill-hover` — the ground a control sits on
- `--wg-kit-group-fill`, `--wg-kit-group-line` — a plate, and the line between rows on it
- `--wg-kit-accent`, `--wg-kit-accent-wash` — the one thing being asked for
- `--wg-kit-success`, `-warning`, `-error`, `-info`, `-note`, `-standout`, `-highlight`, each with
  `-wash` and `-ink`
- `--wg-kit-raise`, `--wg-kit-glass`, `--wg-kit-row-hairline`

A tone is a state of a plate, not a kind of one: a warning block is a `group` painted with
`--wg-kit-warning-wash`.

No cast shadow on a plate. No uppercase. Never colour alone — a state carries weight, a shape or an
icon beside it.

## Size and motion

Big. Large controls, large corners, generous spacing. Nothing under the finger. One unusual shape per
widget, on the thing the eye seeks; under a large radius the corner belongs to an icon, and text
stays inside the safe box. Motion answers a press — springy, interruptible, immediate. Nothing
animates because a screen appeared.

## Empty and broken

An empty collection gets a sentence. A failed read gets the reason. A refused verb gets the tile
saying so. A widget that goes blank is worse than one that says it has nothing, and the box keeps its
space and stays a drop target either way.
