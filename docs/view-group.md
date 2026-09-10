# A view is the same place showing something else

## TL;DR

Switching views is a **group tile**: one tile on the board holds several view widgets and renders
only the active one. The switcher stays a separate widget that writes one fact — which view is
active — and the group reads it. Rejected: giving every view its own tile and hiding the inactive
ones.

## The decision

A board tile is a region. A view is not a second region — it is the same region showing something
else. The group tile is that sentence in code: one place, one entry in one layout, contents that
swap.

The alternative was visibility by context: every view gets its own tile, and the board hides the
tiles whose view is not active. It loses twice.

- **The layout moves.** A hidden tile either reflows the board or forces the engine to reserve a
  place for something it is not drawing. Reserving is a new concept in the layout engine; reflowing
  on every switch is the jarring thing we have spent this project removing.
- **A new view costs three edits.** Positions are authored per layout, and there are three of them
  (4, 8 and 12 columns). Adding Timeline means placing it three times, and getting the three to
  agree. In the group it is one entry.

## A mount is a slot the parent does not feed

This section used to say the opposite, and the reason it said so was real: slots and mounts shared
no code path except the final registry lookup. That was a fact about the code, not about the idea,
and the code has since been changed to match the idea. Both are now the same record in the file —
`{ widget, settings?, sources?, slots?, mounted? }` — read and written by one pair of functions in
`src/model.js`.

Two words for "a place a widget goes" is one word too many. The distinction that survives is
whether the PARENT FEEDS IT, and the manifest already says that: a slot spec with a `gives` clause
is fed, one without is not.

- **Fed** — the parent resolves the data and hands it down, so the child owns nothing and there is
  nothing inside it to configure. `@task/kanban-board` gives its `card` slot a task; that is what
  makes replacing the card a setting rather than a fork.
- **Unfed** — the child owns its own props and settings, goes through its own `WidgetHost`, and
  resolves its own bindings and where rows. The group's views are these.

This is the distinction Vue calls a scoped slot, React a render prop and Plasmic
`renderPropParams`. None of them needed a second noun for it either.

The stored shape is the same; whether the record HOLDS anything is the consequence. A fed slot
carries nothing but `widget`, so its record reads as one line and a diff on a real note stays
small.

### What the file still keeps apart

`slots` and `mounted` remain two keys sharing one record shape, because the KEYS are different
namespaces: a slot key is a name the widget's manifest declares (`card`), a mount key is a widget
id derived from a setting value (`@task/kanban-board`, `#2` on a repeat). Merged today, the map
would have to hold both — and the widget-id key is the very thing that moves onto board-owned
names next. Measured across the twelve shipped manifests: one declares slots, one declares mounts,
none declares both, no slot name contains `@` or `/`, and every widget id does. Zero collisions
today, and no reason to spend the risk before the keys are the same kind of thing.

### The pre-record shape still reads

A slot persisted as the widget id alone for as long as the id was all it had to hold:
`slots: { card: "@task/task-card" }`. Every note in the vault is written that way, and every one of
them still opens — `normalizeHeld` takes the bare string as the record's `widget`, and a mount
written before the shape takes its widget off its own key. Nothing migrates a note in bulk; a note
is rewritten when its owner edits it, and not before.

## Who owns what

- The **switcher** is its own widget. It writes the `view` context key and knows nothing else.
- The **group** reads `view` and renders the matching child. It knows nothing about what the
  children do.
- Each **view is a whole widget**, with its own manifest, settings and sources.

One writer, one reader, and the switcher can sit anywhere on the board — which it must, because it
belongs beside the board tabs rather than inside the board region.

## What the reviews changed

Both risks were real, and two reviews found more. What the code does now:

- **Sizing** stayed out of the group, as decided. It passes its own place straight through.
- **Bindings do resolve** — but only for an UNFED child. A fed slot is handed its data; an unfed one
  goes through its own `WidgetHost`, which is the only path that builds gateways and resolves refs.
- **A ref is per INSTANCE, not per widget.** A mounted child's tile id is `container/mount`, so its
  props are offered under `container/mount/prop` and two mounted copies of one widget are two boxes.
- **A registration is dropped on unmount, by identity.** A tile rendered inside the settings window
  and on the board is two instances of one id; the one leaving may only drop what it still owns.
- **A mount that cannot resolve is named, not swallowed.** The registry already distinguishes
  "never a widget" from "failed to load"; the engine now carries that through, and the group draws
  it. A selection no view answers to says so instead of quietly showing a different view.
- **The view list is published, not authored twice.** The group resolves it and puts it in context;
  the switcher reads it. Its own setting remains the fallback.

Still open: releasing a claim frees the key's OWNER but leaves its VALUE. A removed group's
published list outlives it. Fixing that means deciding whether removing the board tabs should also
forget which board was selected — a bigger question than it looks.

## A board with no group offers to become one

A switcher with nothing to offer used to say so and stop there, and the sentence was cut off
by its own one-row tile. Every board written before the group existed is in that state, and the
manual repair leaves the board worse: placing a group from the catalogue gives it its own kanban
while the loose one stays, so two boards are drawn at once and both write `columns`.

So the switcher offers **Add a view group**, and the BOARD folds it — `foldIntoGroup()`, a command
the host hands down beside `pickWidget`. A widget cannot do this itself: it owns no tiles. The board
finds the installed widget that has a mount, moves every tile whose manifest declares a `view` name
into that mount with the settings, props and slots it already had, seats the group in the place it
emptied at every authored width, fills the rest of the list from the mount's declared default so a
group of one view is never the result — and binds the switcher's own props to the group it just
made, which is what the `holder` map names.

`manifest.view` is the whole selector: it is a widget saying it is a nameable view, which is
already what names it in the strip.

## What the archived view shows

The archived **columns of the current board**, and nothing else.

Archived boards stay where they already are — behind the tab strip's own menu — because that is
where a person is when they think about boards. Putting both lists in one view would make a single
surface answer to two different owners, and it would change meaning under the reader every time
they switched board: half the list would follow the board, half would not.

So the view is bound to the board like every other view is, and it holds one list.
