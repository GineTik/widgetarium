# Composing a screen

`widget.md` is how you write one widget. This page is how you put several together.

## Two kinds of rule

**Measured** — checkable without opinion. Pane count. Tap targets. Line length where prose wraps.
Tiles per row dividing the column count. A box with one child. A declared region left empty. A tile
outside its `maxSize`. Do not argue with these.

**Judged** — yours alone. Which pattern this is. Whether a tile earns its width. Whether the
hierarchy is right. Measured rules keep you from shipping something broken; they cannot make it good.

## Declare before you build

Before the first tile, say three things in the chat:

1. **The pattern**, by its name from [the catalogue](../patterns/README.md) — `list-detail`,
   `matrix`, `dashboard-grid`. If you cannot name it, you are about to stack widgets in a column.
2. **The product you took the layout from.** One line: "Habit rows left, selected habit's detail
   right, the way TickTick does it."
3. **What each region is for.** One clause per region — that clause is its `##` title.

A declaration can be checked against what you built; an intention cannot. Said `list-detail` and both
side regions came out empty — the declaration contradicts the geometry. Said `dashboard-grid` and it
scrolls — the pattern refuted itself.

## The order of work

1. **Read the note.** A board already there already has a pattern — find it in the catalogue and read
   that file first. A change breaking the pattern's rules is a regression even when every tile is fine
   alone.
2. **Ask what is really being asked for.** "Build me a tracker" means an application: add, edit,
   delete, reorder. **A question the interface should answer is not a question to ask** — "one habit
   or several?" is a missing feature wearing a question mark.
3. **Read the pattern, not the web.** Name it.
4. **Check the width the pattern needs** against the width you have.
5. **Place one widget. Save. Then the next.**
6. **Roles and surfaces.** Every group box carries a `role` and a `purpose`, and every node carries
   the `surface` you gave it as you placed it. Nothing lays one for you. See
   [surfaces.md](surfaces.md). Once the board has been drawn, `widgets.mjs surfaces <note> --text`
   reads it back and says which plates look wrong beside each other.
7. **Spacing is not yours to write.** It follows the grouping, per the
   [spacing hierarchy](../patterns/spacing-hierarchy.md): a box only where a surface, a heading or a
   turn of direction makes the group visible.
8. **Measure before you claim done.**

## What every screen owes

- **The collection, not one member.** If the person can have more than one X, the first region is a
  list of X.
- **A visible way to create.** Fixed, always there. One primary action per screen.
- **Create, edit, delete, reorder** of the core entity — and **editing a past entry**. Across 18,464
  reviews of six habit trackers the most-upvoted complaint was being unable to fix yesterday, and not
  one of the six offered it.
- **An empty state per region**, at that region's size. See [empty-state](../patterns/empty-state.md).
- **A today view** where time is involved: what is due now, one press from done.

## Words on the screen

Text is placed with `@default/obsidian-markdown-preview`, and its level follows the tree:

| Markdown    | Where it stands                                         | What it says                                                                                              |
| ----------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `#`         | Once per board, first in the `keep` column              | What this screen is                                                                                       |
| `##`        | First in every root region holding more than one widget | What the region holds. A detail region is titled by the widget that draws the record, never by typed text |
| `###`       | First in a group, when a region holds several           | What the group is: stats, calendar, log                                                                   |
| a paragraph | Under the title it explains                             | What the interface cannot say by itself                                                                   |

- **A widget that names itself gets no title above it.**
- **An explanation is what the screen does not already show.** "Tasks without a date land here" is
  one; "This is a list of tasks" is not. Two sentences at most.
- **Never skip a level**, and never a second `#`.
- **Text wears no surface.** It stands on the unit it labels.

The source is a gateway: typed into the tile, bound to a note, or read from anything answering with
text.

## Width is declared, not taken

The board honours `maxSize`. A widget that must not grow says so in its manifest; it never says so by
declining the width it was given.

**Before placing a widget, check whether it caps its own width.** A calendar with no `maxSize.w`
stretches to the full board and shows a near-empty grid at 1384px. If a widget needs a cap it does
not have, add it to its manifest.

Prose measure rules apply only where **running prose wraps** — 60 characters ideal, 80 the ceiling. A
metric tile reading "Revenue / $1,240" has no measure to violate.

## Before you say it is done

```bash
node .widgetarium/bin/widgets.mjs layout <note>
```

- Does every leaf's width match what that widget is for?
- Is any box holding exactly one child? Prune it.
- Did you declare a region and leave it empty?
- Does the geometry match the pattern you declared?
- One `#`, and a `##` opening every region holding more than one widget?
- Is there a single largest element, and is it the most important one?
- Do gaps come in at least two sizes?
- Does `surfaces <note>` advise exactly what the note wears, with nothing under `Pads:`?
- Is anything full-width that did not earn it?

Then look at it. `claude` can read a PNG. Measurement catches what is broken; only looking catches
what is merely bad.

## The failure this page prevents

A column of full-width tiles, every gap the same, every element the same weight, one habit, no way to
add another, a calendar stretched across 1384px showing nothing. Every part of it a decision nobody
made.
