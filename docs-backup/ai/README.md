# The Widgetarium handbook

You build screens inside somebody's Obsidian vault. A page here answers the question, or the question
does not need answering to place the widget.

| Page                            | What it settles                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| [board.md](board.md)            | The note, the board block, the YAML, the layout tree, how a tile is placed and bound |
| [screen.md](screen.md)          | How to compose several widgets into a screen                                         |
| [surfaces.md](surfaces.md)      | Roles, the five surfaces, what a plate goes around, how they nest, the gaps          |
| [patterns/](patterns/README.md) | The layout pattern catalogue                                                         |
| [widget.md](widget.md)          | What a widget is, its manifest, its props, how to write one                          |
| [catalogue.md](catalogue.md)    | Finding and installing widgets                                                       |
| [components.md](components.md)  | Sourcing components from published registries                                        |
| [design.md](design.md)          | Tokens, shapes, motion                                                               |

## The laws

Numbered in the order you obey them. 1 to 3 govern the first minute and are the ones that get broken.

**1. Say what you are doing, in one line, before every action.** Name the thing and the reason:
_reading the pattern catalogue to pick the shell_. Silence is scored as a failure on its own.

**2. Place before you understand.** The first widget stands on the board before you open a second
handbook page. If you cannot place anything yet, say what is missing and ask.

**3. One widget at a time, in front of the person.** Place, save, let them see it appear. Then the
next.

**4. Search the catalogue before you write anything.** One way in:

```bash
widgets.mjs find --role <role> --reading <kind> --needs <types> --about <words>
```

It scores every widget against the hole and the fields the person's notes hold, and prints why each
ranked where it did. Nothing is filtered out — a near neighbour with different controls is a good
answer. `--reading` takes `sequence`, `comparison`, `table`, `cross`, `field`. `--pack`, `--tag`,
`--source` narrow it. Called with nothing, it is the whole catalogue.

**It is the whole catalogue, not the vault.** Every row says whether it is here: `have` is installed,
`GET ` is offered by a source and one command away. A row you want is taken with
`widgets.mjs install <id>`, and writing a widget because the vault happened not to hold one is the
mistake this line exists to stop.

**5. Take the pattern, do not only name it.** The six that cut a page are data, not prose:

```bash
widgets.mjs pattern list-detail
```

It hands back the skeleton — every region with its `role`, its `purpose`, its `surface` and whether
it is kept or collapses — and the board keeps `pattern:` beside its tiles. From then on the
declaration is checkable: `lint` names a region count that does not match, a region holding the wrong
role, and a declared region left empty. Naming a pattern in the chat and building something else is
the failure this replaces. Say which product the layout came from, in one line, as before.

**6. What is in the vault is the research. Never search the web while building.** If the catalogue
has no row for what you need, build without it and say so in one line.

**7. Never read the plugin source to answer what a handbook page answers.** Open it only with a
defect in front of you and a page that does not cover it, and say which page failed you.

**8. A component comes from a registry before it comes from your hands.** See
[components.md](components.md), and read it when you are about to draw one.

**9. Colours, radii and type come from `--wg-kit-*` tokens.** A hardcoded colour is a defect.

**9a. A widget you wrote is checked before it is placed.** `widgets.mjs check <id>` exits 1 while
anything is wrong:

| Finding       | What it means                                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **colour**    | A colour written by hand. The person's theme repaints a token and cannot repaint your hex.                                                                                                                                     |
| **type**      | A `font-family` or `font-size` written by hand. Type comes from the host through the kit.                                                                                                                                      |
| **unbounded** | Rows drawn from a `list` read with no `limit`. Everything that draws rows paginates from the first row. An aggregate that needs more says how many, in its own source.                                                         |
| **role**      | A manifest naming none. No surface law can judge it, so it wears nothing.                                                                                                                                                      |
| **reaches**   | A name imported from `widgetarium` that its surface does not carry. Crashes the widget the moment it draws.                                                                                                                    |
| **heading**   | An `h1` or `h2` drawn inside a widget whose role is not `text`. A screen and a region are titled by a markdown node standing beside the widget, so a title drawn in here lands inside the plate and the board cannot space it. |

**10. Lint every save.** `widgets.mjs lint <note> --text` exits 1 until the layout is valid. Never
leave a board that does not lint clean.

**11. Give every node its surface as you place it.** You decide, and the plugin lays none for you.
It never overwrites what you wrote, and a node you leave bare stays bare. `surfaces.md` carries the
five surfaces, when to reach for each and where each may stand.

`widgets.mjs surfaces <note> --text` reads the **drawn** board and says which plates look wrong
beside each other. Run it when something looks off, after the board has been drawn — not to collect
surfaces to write.

**12. Measure before you claim done.** `widgets.mjs layout <note>` prints the real width of every
region and tile.

**13. Nothing is done until it is on the board and drawing.** Written but not placed, placed but not
bound, a prop left on its default — none of those are finished.

## Never

- Delete a person's notes, or rewrite a note that is not the board you were asked to build.
- Write into `.obsidian/`. Read the plugin source there only under law 7.
- Leave a board block holding YAML that does not parse. The note stops rendering.
- Bump `v:` in a board block. The plugin writes it; you copy what is there.
