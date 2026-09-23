# The design system

## TL;DR

**You choose every surface, as you place the node.** The plugin lays none for you and never
overwrites what you wrote. A node you leave bare stays bare. This page is the whole of what you
need: five surfaces, when to reach for each, and where each may stand.

Spacing, corners and colour are not yours — they are computed from the tree and the theme. Never
write a gap, a radius or a colour.

## The five surfaces

| `surface` | What it draws | What it says |
| --- | --- | --- |
| absent, or `none` | nothing | this needs no boundary of its own |
| `apart` | one 1px line on one side, no corner, no plate | a different area of the same screen |
| `group` | a grey plate, the ink colour over what lies beneath | several things answering one question |
| `item` | the page's own raised colour, no edge, no shadow | one member of a set, lying on its group |
| `object` | a raised plate with a hairline edge | a thing on top of the page that you act in |

`group` is a few percent of the text colour over whatever is beneath, so a `group` inside a `group`
lands one step darker in a light theme and lighter in a dark one — no second token, no decision.

## When to reach for each

**`group` — the set needs an edge it has not got.** Rows that run the full width have no left or
right of their own; marks in a chart have no outer boundary. The plate is what gives them one. A
list of tasks, a board of columns, a heatmap with its scale and legend.

**`item` — inside a `group`, for its members.** A card in a column, a row in a list, a message in a
thread. An `item` is meaningless on its own and may stand nowhere but on a `group`.

**`object` — each member is already complete.** A project card, a stat tile, an album with its
cover: you could open any one of them, and each already draws its own edge. Put them side by side on
the page with no plate around the set — a plate there is an edge drawn twice. **Never inside a
`group`.**

**`apart` — a pane.** Navigation, a queue, an outline beside a document. It is a boundary, not a
plate, and it costs nothing.

**`none` — the default, and the right answer more often than it looks.** Text, controls, media, a
single widget standing under its own heading. **A heading and the spacing step already say "these
belong together"** — reach for a plate only when they do not.

### How this vault uses them

- **A sidebar holds no cards.** Rows of navigation wear nothing; selection is a state, not a plate.
  The one exception is an information card — a notice, a count, something that is not a destination
  — and that takes `group`. Enforced: `ALLOWED_INSIDE[APART]` in `src/surface-roles.js:29` has no
  `item` in it, so a navigation row cannot be plated even by accident.
- **A region title is never inside the plate.** A screen and a section are titled by a markdown node
  standing beside the tile, so every plate begins after the title. A widget that draws its own `h1`
  or `h2` is a `check` finding.
- **A control strip goes above the plate, not in it.** Filter, sort, group-by and search belong to
  the person, not to the set.
- **One accent, spent on one thing.** The thing the eye is looking for. Everything else is the muted
  tier.

## Where each may stand

Read by the nearest `group`, `object` or `item` above the node. An `apart` creates no plate and does
not count. Enforced by `ALLOWED_INSIDE` in `src/surface-roles.js:29`; the Design tab greys out what
it refuses.

| Nearest plate above ↓ / wears → | `group` | `object` | `item` | `apart` |
| --- | --- | --- | --- | --- |
| none — the page, a region, a pane | yes | yes | **no** | yes |
| `group` | yes | **no** | yes | yes |
| `object` | yes | **no** | **no** | yes |
| `item` | yes | **no** | **no** | yes |

**At most two plates stack from the region down**, counting any container a widget paints inside
itself. A plate whose every child wears a plate is an error — if everything is raised, nothing is.

## Roles

A widget names its `role` in its manifest; a box you build names `role` and `purpose`.

```yaml
- dir: row
  role: indicators
  purpose: How the selected habit is going
  surface: group
  of: [{ id: w3 }, { id: w4 }, { id: w5 }]
```

`purpose` is the one question the box answers. **Two things share one plate only when they answer
one question together.** A box that exists only to lay things in a row gets neither, and `lint`
names a box of its parent's direction with no surface and no heading as a phantom.

| `role` | What it is | Usually wears |
| --- | --- | --- |
| `navigation` | a place to steer from | `apart`, as a pane at the edge of a row |
| `indicator` | one measure | `group`, or `object` beside other complete tiles |
| `indicators` | several measures of one overview | `group` |
| `collection` | many instances of one entity | `group` when its members are rows; nothing when they are complete cards |
| `detail` | everything about the one selected thing | `group` |
| `composer` | where a person makes something | `object` |
| `control` | acts on another unit | nothing — it stands inside what it controls |
| `media` | its own background is the content | nothing |
| `text` | words labelling what is beside them | nothing |

A role says the **most** a node may be set apart, never an obligation.

## Spacing and corners are computed

Never write a gap or a radius. A box's children stand 24px apart in a region, 16px one box down, 8px
deeper — read off the depth, one step closer after a `text` widget and between repeats of one
widget. Between two plates one plate's padding is taken off, so cards stay close at every level.

Every plate is rounded concentric with the one around it and re-laid on every change, so carrying a
tile into a group changes its corners at once.

Inside a widget the same steps arrive as CSS: `--wg-gap-items`, `--wg-gap-parts`, `--wg-gap-cards`.

## Colour

Every colour is a `--wg-kit-*` token. The person's theme repaints a token and cannot repaint a hex.

- `--wg-kit-fill`, `--wg-kit-fill-hover` — the surface a control sits on
- `--wg-kit-card-fill`, `--wg-kit-card-edge` — the card, and the hairline that separates it where
  fill cannot: **on a light theme nothing is lighter than white**, so a card on a plate separates by
  its edge instead
- `--wg-kit-accent`, `--wg-kit-accent-wash` — the one thing being asked for
- `--wg-kit-success`, `--wg-kit-warning`, `--wg-kit-error`, `--wg-kit-info`, `--wg-kit-note`,
  `--wg-kit-standout`, `--wg-kit-highlight`, each with `-wash` and `-ink`
- `--wg-kit-raise`, `--wg-kit-glass`, `--wg-kit-row-hairline`

**A tone is a state of a plate, not a kind of one.** A warning block is a `group` painted with
`--wg-kit-warning-wash`, not a sixth surface.

**No cast shadow on a plate.** Fill, then a hairline where fill cannot reach. Shadow is reserved for
what floats over the page.

**No uppercase anywhere** — not in captions, not on chips.

**Never colour alone.** A state carries a second channel: weight, a shape, an icon. A selected row is
a fill *and* a weight.

## Size and motion

Big. Large controls, large corners, generous spacing. One grid cell is one medium control (42px)
plus one gutter, and nothing may fall under the finger.

An element earns attention by having a form the ones around it do not — **one unusual shape per
widget**, on the thing the eye seeks. Under a large radius the corner belongs to an icon or a shape;
text stays inside the safe box.

Motion answers a press: springy, interruptible, immediate. Nothing animates because a screen
appeared.

## Empty and broken

An empty collection gets a sentence, not a blank. A failed read gets the reason, not an endless
spinner. A refused verb gets the tile saying so. **A widget that goes blank is worse than one that
says it has nothing.** The box keeps its space and stays a drop target either way.

## The three that go wrong

1. **A plate on everything.** If every box is raised, the screen is flat again. Ask what the heading
   and the gap already say.
2. **A plate around complete cards.** They have their own edges; the plate is a second one.
3. **A surface left unwritten.** Nothing lays it for you. A bare node is a choice you made by not
   making it.
