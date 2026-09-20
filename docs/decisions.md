# Decisions

Why the shapes are what they are. Written once, when the decision cost something.

## A record's identity is an id, not its name

A UUID in frontmatter under a namespaced key, exposed as `record.id`. Stored references use it; names
are labels.

**Assigned only on an explicit action, never on render.** A gateway that writes while being drawn
litters the vault with ids nobody asked for. Everything works for records with no id yet: resolve id
first, name or path second.

Duplicate ids come from **copies**, not from generation. The survivor is the one whose path sorts
first, detection happens on read, and the re-mint is a write, so it waits for one.

## The board is one recursive tree

`layout` is a node: a leaf (`{ id, ratio, height }`) or a box (`{ dir, of }` plus `ratio`, `width`,
`keep`, `collapse`, `folded`, `scroll`). A box nests to any depth, which is the point — `[[A], [B, [C
over D]]]` is expressible, and the three named regions `left`, `main`, `right` were not able to say
it.

**Behaviour lives on a property, never on a name.** The root is a row of three boxes; the middle
carries `keep: true`, the two beside it carry `collapse`. That is all the three names ever meant.
Nothing outside `normalizeBoard` compares a node to a name: a box is addressed by its **path**, an
array of indexes from the root.

**A height belongs to the widgets, never to a box.** A box is as tall as what it holds, which is what
lets a row stack without spilling over the boxes below it. A grip resizes the line above it.

**Both older shapes are read once and never written again.** `layout: { left, main, right }` becomes
the root row; a `layouts:` map of `{x, y, w, h}` is read by taking the widest authored width, sorting
places by `y` then `x`, grouping into rows, `w` as ratio and `h` as pixels. Nothing renders, offers
or emits a grid. A board written as a tree declares `v: 2`, which stops an older plugin flattening
it.

**A box exists because it is declared, not because it holds something.** An empty side box is a real
region: it draws as a zone and takes a drop. A sidebar that appears only once something is in it can
never receive the first thing.

**A box that does not fit collapses into what it declares** — `stack`, `drawer`, `sheet`, `menu`,
`hide`. Nothing is chosen by breakpoint; the widths decide. Whether a collapsed box is open is a fact
about the screen, held in a view cell, never in the note.

**There is no line between regions.** The board is drawn inside a note under Obsidian's own chrome,
so a border between two root boxes has neither a top nor a bottom to reach. The gutter is the
boundary.

## Views are a box, not a widget

A box with `dir: "swap"` and an `id` draws one named child at a time and keeps the rest mounted, so
their refs survive a tab change. It publishes `<id>/holds` and `<id>/selection`; the selection is a
view cell, never written to the note. Add, rename, archive, restore and delete of a view are the
tab-rows law applied to the box's children, and deleting a view takes its tiles off the board in the
same write.

A drop never lands as a sibling of a swap child — a drop names nothing — so it falls through to the
view on screen and wraps.

**A fed slot cannot be entered; an unfed one can.** A slot whose manifest declares `gives` gets its
inputs from the parent and owns nothing. Without `gives` the child owns its own props.

## One widget points at another by ref

There is no context bus. A ref is `<tileId>/<propName>`; the board holds one registry of them, and a
where row carries `{ ref }` where a value would stand.

A selection — which tab, which view, which card is open — is a box the engine owns **over the very
list it selects from**, so a pick naming a row the list no longer holds is no pick at all.

**There are no settings. Every prop is a gateway, primitives included.** A list of named things is a
collection; a single thing is a value, and its card names the control it draws with. `tile.settings`
is never consulted for a prop: a value a person typed is `{ from: typed, value }` or
`{ from: typed, rows }`.

**Declared is not rendered.** Six rounds shipped with every gate green and were rejected on sight. A
value sliced by a selection must be read through its gateway **inside the widget that draws it**. One
level up gives a correct declared value and a stale screen.

## A plate is one component, and the laws decide it at render

The tile's plate belongs to the node in the note: the agent writes it, the Design tab switches it,
`lint` holds the board to it. Everything a widget paints under that plate is `<Surface>` from
`widgetarium/kit`, with `type` naming the same four surfaces and `none` as the default, so a widget
that asks for nothing stays bare.

Two writers for the tile's own plate were refused. A widget declaring its root surface in the render
tree is invisible to the tree — `wornSurfaceAt` gates a write, and nothing can gate what only exists
once drawn — so the node keeps that fact and the widget paints inside it.

What makes this safe is that the depth travels in React context rather than being measured off the
DOM afterwards. `PLATES_ABOVE` is seeded from the laid node's `plates` and `underSurface` **into the
tree the tile's shell draws**, because a widget is rendered in its own root and context does not cross
that seam — seeded one level out, every widget counts from zero and the third plate paints itself
while the jsdom checks stay green. Every painted Surface provides the next level, and
`plateRefusal` answers before anything is painted: a plate the laws refuse paints nothing and warns. The DOM census in `surface-measure.js`
stays what it was — advice about colour and contrast — and is no longer the only thing that knows a
widget painted a third plate.

The payoff is the reason to do it at all: a plate drawn by the kit reading context can be repainted
by the engine — a tone, a density, a design system — without touching a widget. A plate a widget
hand-rolled from its own `background` and `border-radius` never could.

## Three versions, and only one of them is semver

`manifest.json`'s version is Obsidian's business. The two that cost are `v:`, stamped into every
block written, and `api:` in a widget manifest against the range the plugin holds. Both read a
missing number as 1, and both **refuse rather than guess**: a block from a newer plugin is not
mounted and therefore never written back, and a widget outside the range does not mount, install or
draw.

## A markdown post-processor is reading mode only

Live Preview is a different engine and needs a CodeMirror 6 editor extension. Reading view also
caches rendered sections and unloads off-screen ones, so a post-processor cannot be trusted to have
run for what is on screen.

## Migrations are lazy

Reading accepts the old shape, writing emits the new one, and nothing bulk rewrites a vault. A prop's
`aka` carries every name it had.
