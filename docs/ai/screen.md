# Composing a screen

`widget.md` is how you write one widget. This page is how you put several of them together, which is
a different skill and the one that decides whether the person keeps the product.

## Two kinds of rule, and only one of them is yours

**Measured** — a number, checkable without opinion. Pane count. Tap targets. Line length where prose
actually wraps. Tiles per row dividing the column count. A box with one child. A declared region left
empty. A tile outside its `maxSize`. These are not judgements and you do not argue with them.

**Judged** — yours alone. Which pattern this is. Whether a tile earns its width. Whether the hierarchy
is right. No measurement settles these, and pretending otherwise produces screens that pass every
check and read as garbage.

The measured rules keep you from shipping something broken. They cannot make it good. That part is
the work.

## Declare before you build

Before you place the first tile, say three things out loud, in the chat:

1. **The pattern.** Its name from [the catalogue](../patterns/README.md) — `list-detail`, `matrix`,
   `dashboard-grid`. If you cannot name it, you are about to stack widgets in a column.
2. **The product you took the layout from.** One line. "Habit rows in the left pane with the selected
   habit's detail on the right, the way TickTick does it." Never invent a layout for a problem other
   people have already settled.
3. **What each region is for.** One clause per region.

This is not ceremony. A declaration can be **checked against what you built**, and an intention
cannot. If you said `list-detail` and both side regions came out empty, the declaration contradicts
the geometry, and that contradiction is detectable. If you said `dashboard-grid` and the result
scrolls, the pattern refuted itself — a dashboard is "at a glance" by definition.

You are not asked to be right. You are asked to be checkable.

## The order of work

1. **Read the note.** Is there already a board? Then it already has a pattern — find it in the
   catalogue and read that file before changing anything. A change that breaks the pattern's own
   rules is a regression even when every tile is fine alone.
2. **Ask what the person is really asking for.** "Build me a tracker" means an application, not a
   screen. An application lets the person add, edit, delete and reorder the thing it tracks. **A
   question the interface should answer is not a question to ask.** "One habit or several?" is a
   missing feature wearing a question mark.
3. **Research the domain.** What does this kind of screen actually hold? Look at the products people
   use. Name the one you took the shape from.
4. **Pick the pattern** and read its file. Check the width it needs against the width you have.
5. **Place one widget. Save. Then the next.** The person is watching the note redraw.
6. **Measure before you claim done** — see below.

## What every screen owes

- **The collection, not one member.** If the person can have more than one X, the first region is a
  list of X. Nobody puts one habit on a screen; a habit is a row, a tile, a column cell.
- **A visible way to create.** Fixed, always there. One primary action per screen, never two.
- **Create, edit, delete, reorder** of the core entity — and **editing a past entry**. Across 18,464
  reviews of six habit trackers, the single most-upvoted complaint was being unable to fix yesterday,
  and not one of the six offered it.
- **An empty state per region**, at that region's own size. See
  [empty-state](../patterns/empty-state.md).
- **A today view** where time is involved: what is due now, one press from done.

## Width is declared, not taken

The board honours `maxSize`. A widget that must not grow says so in its manifest and the board gives
it fewer cells. It never says so by declining the width it was given.

So: **before you place a widget, check whether it caps its own width.** A calendar with no
`maxSize.w` will stretch to the full board and show a near-empty grid at 1384px. That is not the
board misbehaving — it is a widget that never declared a ceiling, placed by someone who never
checked.

If a widget needs a cap it does not have, add it to its manifest. One line fixes it everywhere.

The measure rules for text apply only where **running prose wraps across lines** — 60 characters
ideal, 80 the ceiling. A metric tile reading "Revenue / $1,240" has no measure to violate. A row of
labels and rings has none either. Do not apply a prose rule to something that is not prose.

## Before you say it is done

Read the measured layout:

```bash
node .widgetarium/bin/widgets.mjs layout <note>
```

Then check, honestly:

- Does every leaf's width match what that widget is for?
- Is any box holding exactly one child? Prune it.
- Did you declare a region and leave it empty?
- Does the geometry match the pattern you declared?
- Is there a single largest element, and is it the most important one?
- Do gaps come in at least two sizes — small inside a group, larger between groups?
- Is anything full-width that did not earn it?

Then look at it. `claude` can read a PNG; if a screenshot of the board exists, open it. Measurement
catches what is broken. Only looking catches what is merely bad.

## The failure this page exists to prevent

A column of full-width tiles, every gap the same, every element the same weight, one habit, no way to
add another, and a calendar stretched across 1384 pixels showing nothing.

It passed no rule because no rule was applied. Every part of it was a decision nobody made.
