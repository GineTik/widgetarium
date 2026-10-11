# Surfaces

Three words, and most of the screen wears the first.

| `surface`         | Paints                                        |
| ----------------- | --------------------------------------------- |
| absent, or `none` | nothing                                       |
| `apart`           | one 1px line on one side, no plate, no corner |
| `group`           | a plate: a faint grey, no edge                |

The page is the theme's colour and a plate is a light grey on it; a `group` on another `group` turns
white. A plate is never outlined. `apart` carries `side: start | end`.

## The rules

1. **Only a repeat earns a plate**: the same widget beside it again, or a box holding several of the
   same thing. A single thing stands bare — a heading, prose, a chart, one block. `lint` names an
   unearned plate (law R).
2. **A grid gives every cell its own plate.** The grid itself wears nothing.
3. **Rows of data stand on the page, with a line between them** (`ItemGroup`). The rows wear nothing
   of their own; a list earns a plate only by rule 1, as a `Card` around the `ItemGroup`.
4. **A state replaces the grey.** `tone` paints the plate with a warning, an error, a success or the
   accent.
5. **A control is not a plate.** A field, a switch, a count keep their own darker grey.
6. **Nothing lays a plate for you.** Write a surface on every node as you place it; a node left bare
   stays bare.

## Where each may stand

Read by the nearest plate above; an `apart` makes no plate and does not count.

| Nearest plate above ↓     | `group` | `apart` |
| ------------------------- | ------- | ------- |
| none — page, region, pane | yes     | yes     |
| `group`                   | yes     | yes     |

Two plates deep from the region, counting any a widget paints inside itself. A plate whose every
child wears a plate is refused. **These are a gate, not advice**: `lint` fails a note that breaks
them, and a surface they refuse cannot be written.

**A widget that paints its own plates wants a bare node.** `@default/kanban-board` paints a plate on
every column and every card, so its tile wears **no** surface. Give a node `group` only when the widget
draws flat content on it. Inside a widget every plate comes from the kit (`widget.md`, "A plate inside
a widget").

## Roles

A widget names `role` in its layout; a box you build names `role` and `purpose`, the one question it
answers: `layout`, `navigation`, `indicator`, `indicators`, `collection`, `detail`, `composer`,
`control`, `media`, `text`. `layout` is the section: with `text`, the only role allowed its own `h2`,
and it wears no surface; its `getArrangement` plates what stands in it by rules 2 and 3.

## Spacing and corners are computed

Never write a gap or a radius. Children stand 24px apart in a region, 16px one box down, 8px deeper,
one step closer after a `text` widget and between repeats of one widget. Every plate is rounded
concentric with the one around it. So a box exists only where a surface, a heading or a turn of
direction makes a group visible; a box of its parent's direction with neither is a phantom `lint`
names.

## Colour, size, motion

Every colour is a `--wg-kit-*` token: a theme repaints a token and cannot repaint a hex. Two text
colours, `--wg-kit-text` and `--wg-kit-text-muted`; a tone is a state of a plate, never a kind of
one. No cast shadow on a plate, uppercase only as `clean-ui.md` allows, never colour alone.

Big: large controls, large corners, generous spacing. One unusual shape per widget, on the thing the
eye seeks. Motion answers a press — springy, interruptible — and nothing animates because a screen
appeared.

## Empty and broken

An empty collection gets a sentence, a failed read its reason, a switched-off command the tile saying
so. A widget that goes blank is worse than one that says it has nothing.
