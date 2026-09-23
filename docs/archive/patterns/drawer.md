# Drawer

A region that cannot hold its place at the current width leaves the layout flow and returns as a
temporary layer over the content, summoned by an explicit control.

## The shape it suits

Any region whose content is **occasional rather than continuous** — navigation, filters, settings,
supporting context.

The test is one question: **does the user need it _while_ acting on the main content?** If yes, it
must stay docked or move below. If no, it may become a drawer.

## Take it when

- A region has run out of room and its content is occasional.
- A task needs focus on a layer above, briefly.

## Leave it when

- **The content is needed simultaneously with the main content.** A modal side sheet "must be
  dismissed in order to interact with the underlying content" — that is the whole cost.
- **You are using it to hide a layout problem.** This is the pattern's habitual abuse: a region that
  does not fit becomes a drawer, and a layout problem becomes a hidden-feature problem.

## Which form, at which width

Material states it directly: "standard side sheets are supplementary surfaces used mostly in medium
to expanded breakpoints, like tablet and desktop... **modal side sheets are preferred in compact
breakpoints, like mobile, due to limited screen size.**"

So: docked above 600px, modal below.

## Regions

| Region | May hold                                                                                                                                                                                                      | May not hold                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drawer | Whatever the displaced region held; a close affordance — "a close icon button is highly recommended, increases accessibility, and makes focused side sheets easier to close"; action buttons; vertical scroll | Horizontal scroll; content needed simultaneously with the main content; **a second drawer** — "let people dismiss a modal view before presenting another one" (Apple); a nested hierarchy of views |
| Scrim  | Dismissal by tap                                                                                                                                                                                              | Content                                                                                                                                                                                            |

## Width

Not applicable — the drawer is the mechanism by which minimum widths are escaped. Material's
threshold for preferring the modal form is the **compact breakpoint, under 600px**.

Below a drawer there is only a pushed screen. For supporting content Material prefers going _down_
rather than _over_: below the focus pane, or a bottom sheet.

## Costs

Invisible until opened, so whatever it holds loses discoverability. It blocks the content beneath.
And it is the standard dumping ground — everything that does not fit ends up here, which is how an
app accumulates features nobody can find.

## Seen in

Gmail on Android (email) · Jira collapsed sidebar fly-outs (work management) · Chrome DevTools console
drawer (developer tooling) · Shopify admin on small screens (commerce).

## Composition

Holds **one** displaced region and nothing more. It may not hold a nested layout — Apple: "if a modal
task must contain subviews, provide a single path through the hierarchy." It may not open another
drawer.

## In a board

Already built, and already a law of the board: below `MAIN_FLOOR_PX` a region with `collapse` stops being
a column and becomes a drawer over the whole Obsidian window — a portal, `fixed`, on the dialog's
layer, growing from the point that was pressed.

The rule that comes with it: **whether a floating region is open is a fact about this screen, not
about the note.** It lives in board state. A resize that gives the region its place back writes
nothing.
