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

## A mount is not a slot

The first draft of this note claimed the group was "the same machinery pointed at a list instead
of a single slot". That was wrong, and a review caught it: slots and mounts share no code path
except the final registry lookup.

- A **slot** is a template hole. The parent resolves the data and hands it down; the child never
  touches `sources` or context on its own. `@orbitask/task-card` is the example — it declares no
  `sources` at all.
- A **mount** is a nested tile minus geometry. The child goes through its own `WidgetHost`, so it
  resolves its own `sources`, substitutes `@board` and `@filters` itself, claims its own context,
  and persists its own settings.

Reach for a slot when the child only draws data the parent already holds. Reach for a mount when
the child is a whole widget that must be swappable — its own manifest, settings and sources.

The group needs the second. That is the whole reason mounts exist.

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
- **`sources` do resolve** — but not through slots. A mount goes through its own `WidgetHost`,
  which is the only path that builds `data`, `actions` and the `@board` / `@filters` substitution.
- **Ownership is per INSTANCE, not per widget.** Context was keyed by the widget's registry id, so
  two mounted copies of one widget shared an owner and the second silently overwrote the first —
  quieter than the collision between two different widgets, which at least warned. The key is now
  `widgetId@tileId`, and a mounted child's tile id is `container/slot`.
- **A claim is released on unmount.** `context.release` existed and was called from nowhere. That
  was survivable while tiles were authored by hand; a mounted set edited as a live list made it
  load-bearing — remove a widget that owns a key and every later writer was refused forever.
- **A mount that cannot resolve is named, not swallowed.** The registry already distinguishes
  "never a widget" from "failed to load"; the engine now carries that through, and the group draws
  it. A selection no view answers to says so instead of quietly showing a different view.
- **The view list is published, not authored twice.** The group resolves it and puts it in context;
  the switcher reads it. Its own setting remains the fallback.

Still open: releasing a claim frees the key's OWNER but leaves its VALUE. A removed group's
published list outlives it. Fixing that means deciding whether removing the board tabs should also
forget which board was selected — a bigger question than it looks.

## What the archived view shows

The archived **columns of the current board**, and nothing else.

Archived boards stay where they already are — behind the tab strip's own menu — because that is
where a person is when they think about boards. Putting both lists in one view would make a single
surface answer to two different owners, and it would change meaning under the reader every time
they switched board: half the list would follow the board, half would not.

So the view is bound to the board like every other view is, and it holds one list.
