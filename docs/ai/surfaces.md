# Surfaces

Four. You write one on every node as you place it. Nothing lays one for you, and a node you leave
bare stays bare.

| `surface`         | Paints                                        |
| ----------------- | --------------------------------------------- |
| absent, or `none` | nothing                                       |
| `apart`           | one 1px line on one side, no plate, no corner |
| `group`           | a plate                                       |
| `object`          | a plate with a hairline edge, lifted          |

**A `group` takes its colour from what it stands on**: grey on the page, white on a grey group. One
name, both looks, no decision. On a light theme nothing is lighter than white, so the white one
separates by the gap around it.

`apart` carries `side: start | end` — which edge the line stands on.

## Where each may stand

Read by the nearest plate above. An `apart` makes no plate and does not count.

| Nearest plate above ↓     | `group` | `object` | `apart` |
| ------------------------- | ------- | -------- | ------- |
| none — page, region, pane | yes     | yes      | yes     |
| `group`                   | yes     | **no**   | yes     |
| `object`                  | yes     | **no**   | yes     |

Two plates deep from the region, counting any a widget paints inside itself. A plate whose every
child wears a plate is refused.

**These three are a gate, not advice.** The Design tab greys out what they refuse, `lint` fails a
note that carries one, and a surface they refuse cannot be written at all. Everything else about
surfaces is yours. Read [examples.md](examples.md) and build what the screens there build.

## Inside a widget

The tile's own plate is the node's, written in the note. Everything the widget paints under it is
`<Surface>` from `widgetarium/kit`, and it is the only way a widget paints a plate:

```tsx
import { Surface } from "widgetarium/kit";

<Surface type="group" tone="warning">
	…
</Surface>;
```

`type` is the same four words, and `none` — the default — paints nothing, so a widget that asks for
no surface stays bare. `tone` paints the plate with a state, which is what a warning block is, and it
replaces the plate's own grey rather than sitting under it.
`apart` takes `side: start | end` and `across: row | column` — the direction the parts it divides
run.

**A widget that paints its own plates wants a bare node.** `@default/kanban-board` paints a plate on
every column and one on every card in it, so its tile wears **no** surface — two plates are already
spent inside. Give a node `group` only when the widget draws flat content on it.

**The same laws decide it, and the widget is not asked.** A Surface counts against the two plates
from the region, the tile's own included, so a `group` on the node leaves the widget one plate and a
second is refused. The refusal paints nothing and says why in the console; it can never reach the
screen as a plate nobody can name. Corners come out concentric with the tile's and are never
written.

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

`navigation`, `indicator`, `indicators`, `collection`, `detail`, `composer`, `control`, `media`,
`text`. A widget without one is never given a surface.

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

- `--wg-kit-fill`, `--wg-kit-fill-hover` — the ground a control sits on
- `--wg-kit-card-fill`, `--wg-kit-card-edge` — a card inside a widget, and its hairline
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
