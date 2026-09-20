# Toolbar and canvas

A persistent strip of mode-setting and action controls beside or above one large direct-manipulation
surface holding the object being made.

## The shape it suits

A **single artefact with spatial structure** that is edited rather than read — where intent is
expressed by _where and how_ the user acts on the surface, and the toolbar only says _with what_.

If the object has no spatial structure, this is a form, not a canvas.

## Take it when

- One document, drawing, board or timeline is being manipulated directly.
- The set of tools is stable and worth muscle memory.

## Leave it when

- **The object is a list of fields.** A form with a save button is the honest shape.
- **There are several objects on screen at once.** A canvas is one surface by definition.

## Regions

Spectrum's application frame is the clearest published breakdown:

| Region           | May hold                                                                                                                                                      | May not hold                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Header bar       | "the highest level of navigation and action items (e.g., modes, file name, global actions, syncing, sharing)"; modes on the left, global actions on the right | Tool selection — that belongs to the sidebar                                                                              |
| Tool sidebar     | "a place for displaying tools and actions"; tools "always located at the top of the left sidebar"; the default tool at the top                                | Content; anything that must expand                                                                                        |
| Canvas           | The artefact at whatever zoom; on-canvas controls                                                                                                             | Permanent chrome that cannot be hidden — "consider temporarily hiding toolbars for a distraction-free experience" (Apple) |
| Transient layers | Menus, options, settings, additional actions — as popovers and trays                                                                                          | Anything the frame should hold permanently: "the application frame structure tends to be static and stable"               |

Apple on what a toolbar is: "toolbars act on content in the view, facilitate navigation, and help
orient people". And on crowding: "choose items deliberately to avoid overcrowding... avoid layouts
that cause toolbar items to overflow by default."

## Width

No single published number. The binding constraint is that **the canvas stays the dominant region** —
if the tools and panels together take more than the canvas, the pattern has inverted.

Narrower: the tool sidebar becomes a bottom bar, "a good alternative to sidebars and a natural place
for interactions, as it is easy to reach" (Spectrum). Popovers become trays.

## Costs

Modal by construction — the active tool changes what a click means, and that state is easy to lose.
Toolbars accrete: every feature wants a button, and the overflow menu is where features go to die.
Mode switching "changes the entire interface", which is powerful and disorienting in equal measure.

## Seen in

Photoshop (raster imaging) · Miro (whiteboarding) · AutoCAD (engineering) · Canva (consumer design).

## Composition

Pairs naturally with a [supporting-pane](supporting-pane.md) on the right — that is the
Figma/Photoshop/Keynote shape, and Apple cites it: "Keynote in macOS uses split view panes to present
the slide navigator, the presenter notes, and the inspector pane in areas that surround the main
slide canvas."

May sit inside a sidebar shell's content region. May **not** contain a list–detail or a nested canvas
— a second canvas is a second document and belongs in a tab.

## In a board

A `row` box at the top of the `keep` column holding controls, with the canvas widget below it at
`height` or flexible. The controls row must declare a small `maxSize.h`, or it will claim space it
does not use.

Widgetarium boards rarely need this: a board _is_ a composition surface, and a canvas widget inside a
board is a surface inside a surface. Ask whether the tools belong to the board's own edit mode
instead.
