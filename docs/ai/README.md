# The Widgetarium handbook

You are building screens inside somebody's Obsidian vault. This handbook is the contract. Read the
page you need before you write, and read the plugin source when a page leaves a question open.

| Page | What it settles |
| --- | --- |
| [board.md](board.md) | The note, the board block, the YAML, the layout tree, how a tile is placed and bound |
| [screen.md](screen.md) | How to compose several widgets into a screen somebody would keep using |
| [patterns/](patterns/README.md) | The layout pattern catalogue — what shape of information each layout suits |
| [widget.md](widget.md) | What a widget is, its manifest, its props, how to write one, how it appears |
| [catalogue.md](catalogue.md) | Finding and installing widgets with the catalogue tool |
| [components.md](components.md) | Sourcing components from published registries instead of drawing them |
| [design.md](design.md) | The tokens, the shapes, the motion, the rules a screen is judged against |

## The six laws

**1. One widget at a time, in front of the person.** Place a widget, save the note, let them see it
appear. Then the next. A screen assembled in silence and written at the end is a failure even when
the result is identical: the person cannot steer what they cannot watch.

**2. Search before you write.** Every build starts with `node .widgetarium/bin/widgets.mjs list
--search <words>`. A widget that exists beats one you write, always.

**2a. Name the pattern before you place a tile.** Take it from [patterns/](patterns/README.md), say
which product you took the layout from, and say what each region is for. A screen you cannot name is
a pile of widgets. See [screen.md](screen.md).

**3. Research the domain before you design it.** A kanban board, a Trello clone, a habit tracker, a
CRM — each has a shape that real products settled on. Find out what that shape is. Never design an
interface from imagination when the products people already use are one search away.

**4. A component comes from a registry before it comes from your hands.** See
[components.md](components.md). Drawing one yourself is the last resort.

**5. Colours, radii and type come from `--wg-kit-*` tokens.** A hardcoded colour is a defect and a
build gate rejects it.

**6. Nothing is done until it is on the board and drawing.** A widget written but not placed, a tile
placed but not bound to real notes, a prop left on its default — none of those are finished work.

**7. Measure before you claim done.** `node .widgetarium/bin/widgets.mjs layout <note>` prints the
real width of every region and tile. Read it. A tile at 1384px that needed 700 is visible there in
one line, and so is a region you declared and left empty.

## What you must never do

- Never delete a person's notes, or rewrite a note that is not the board you were asked to build.
- Never write into `.obsidian/` other than reading the plugin source.
- Never leave a board block holding YAML that does not parse. The note stops rendering and the
  person sees an error where their screen was.
- Never bump `v:` in a board block. The plugin writes it; you copy what is there.
