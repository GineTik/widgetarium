# Layouts in five planners and calendars

Things 3, TickTick, Fantastical, Google Calendar, Sunsama. Vendor documentation unless marked.

## Time as a spatial axis is not a grid of cards, and four tests separate them

A calendar grid is a **scale drawing**. A gallery grid is an **enumeration**.

| | Time grid | Gallery grid |
| --- | --- | --- |
| Where position comes from | the datum itself — date → column, clock → offset, duration → height | sort order → index → reflow |
| Column count | fixed by the domain: 7 in a week, at any width | fixed by available width; changes on resize |
| Empty space | **is data** — a free hour is a visible gap | is nothing; items are dense, the tail is blank |
| Moving an item | edits the datum (reschedules it) | edits the sort, or nothing |
| Two items at one coordinate | a conflict, which must be drawn as such | impossible by construction |

**The decisive test: resize the container. If which cell a thing sits in changes, position was arbitrary.** Google's week is seven columns at every width — its density setting changes pixels per hour, never the assignment. A gallery reflows 4-up to 3-up and every item moves with no data changing.

**Second test: can the layout answer a question about absence?** "When am I free Thursday afternoon" is answerable only where blank space is addressable. No gallery can answer it.

The strongest corroboration is Google's refusal: side-by-side per-person columns exist **in Day view only** — "The side-by-side calendars won't work for the week or month view." Adding a categorical axis needs an axis not already spent on time. **A grid has one axis to sell and cannot sell it twice.**

## The intermediate case deserves its own name

Fantastical's **DayTicker**: a horizontal strip of day tiles, "each event presented with a colored pill, showing approximately when in the day each event occurs", with a unified list underneath. Swiping either moves the other.

x carries date (ordinal, meaningful, non-permutable); y carries *approximate* time — enough to read the shape of a day without paying a grid's width. The list below carries the text the pills cannot.

It also has the only documented zero-density rule in the whole research: "By default, empty days are omitted from the DayTicker", with a setting to keep them.

Refused on iPad — with a sidebar available, the compressed strip is not worth its height.

## Density: when the cell can no longer hold what the level below held, change what the cell encodes

- **Day** — full clock resolution on y. Perceivable: duration, overlap, the shape of gaps. Fails when short events compress to slivers.
- **Week** — 7 × time. Perceivable: rhythm, and where the free blocks are. TickTick states it outright: "highlights busy and free time blocks." Fails when a column is too narrow for a title and the event degrades to a coloured bar.
- **Month** — **the intra-cell time axis is dropped.** The cell is a day. Perceivable: all-day spans, deadlines, how loaded each day is. Fails the moment a day exceeds the cell height, and the truncation is silent about what was dropped.
- **Year** — **identity is dropped for quantity.** Fantastical: "the darker color will have more events." Perceivable: seasonality and clusters. You cannot read or act on an event.

Two crossings, and they are the same move made twice: month drops the time axis inside the cell; year drops identity for quantity. **Change what the cell encodes rather than shrinking it.**

**No product publishes a numeric density threshold.** The closest documented rules are Google's three named modes and Fantastical's empty-day omission.

Google makes density a **setting**, not a breakpoint, and the wording is worth keeping:

- "**Responsive**: Your calendar dynamically scales and enlarges events to fill larger monitors."
- "**Comfortable**: Your calendar keeps the standard layout with traditional spacing, regardless of your screen size."
- "**Compact**: Your calendar shows a denser view with tighter spacing, which allows you to see more events at once."

The product refuses to decide whether extra pixels buy more events or bigger events, and asks.

## Agenda column and calendar grid answer disjoint questions

- **The grid** answers *when, how long, what collides, where is the gap.* Width per item is fixed by the time it occupies, so it cannot show text. It is the only one that can show **absence**.
- **The column** answers *what, in what order, in full words.* Height per item is set by content, so titles and notes fit. It cannot show a free hour, because a free hour has no row.

Three instances, and the sharpest reason for side-by-side in the whole research:

- **Fantastical** couples them bidirectionally — scrolling the list highlights the day in the mini calendar; clicking a list entry selects the event in the grid. **The list is the index, the grid is the map.**
- **Sunsama** holds **different populations** in the two panes: the column holds tasks with no position on the time axis yet, and **timeboxing is the drag from column into grid**. A layout that replaced one with the other would have nowhere to put an unscheduled intention.
- **TickTick** ships the same under "Show Tasks with Calendar".

**Things is the control case.** It keeps only the column and renders events as a block at the top; tapping hands off to Apple Calendar. A product that never asks "where is the gap" does not need a grid at all.

## A view whose position carries meaning cannot be offered over a set that lacks the value

TickTick's sharpest rule: Timeline is refused on Today / Tomorrow / Next 7 Days and on tasks with no date; the per-list view switch is refused on smart lists entirely — "Default smart lists such as 'Today' are not applicable."

Same everywhere: calendar and timeline refuse undated items; a map refuses items with no location.

## When a heading is enough, and when a plate appears

Things puts every grouping in one scrolling column with no containers: Today cut into the main list and "This Evening"; Upcoming cut into day sections; projects cut by Headings, which "break it up into smaller parts like categories or milestones" and are "only available in projects".

**A heading plus a spacing step is sufficient when all of these hold:**

- the groups are peers on one dimension and mutually exclusive
- they are read **in a fixed order**, and that order is itself information
- the reader wants **sequence**, not comparison — nothing is weighed against a sibling
- group count and size are **unbounded and uneven** — a plate around a one-item group reads as broken; a heading does not
- no group is a **drop target**

**A plate appears exactly when one of those fails:**

- the group becomes a drop target with a boundary — TickTick's Kanban columns, Sunsama's day columns
- groups must be **compared side by side** — TickTick's Eisenhower quadrants
- the group is a **different source** — Sunsama's right panel, Google's side panel

**The equivalence worth keeping: a kanban column is a Things heading rotated 90°.** The heading and the column carry the same grouping. What the rotation adds is comparability and a drop edge — and those are precisely what the plate pays for. **If you are buying neither, the heading is the correct form.**

("No plates in Things" is a reading of its visuals, not documented policy.)

## The today screen

- **Things** — events at top, then drag-ordered to-dos, then "This Evening". Earns a place: a start date of today, a deadline today, or a calendar event today. Nothing else can appear.
- **TickTick** — tasks due today, events, habit check-ins that opted in via "Show in Today", plus suggested unfinished tasks ranked on creation time, rescheduling history and upcoming due dates.
- **Sunsama** — one day column beside the calendar, totals compared against a workload threshold and a shutdown time. **Earns a place: a human put it there during the ritual.** Nothing arrives automatically; the whole product is that gate.
- **Fantastical** — not a separate screen; the default position of the main one.
- **Google Calendar** — none. The nearest is Day view plus the Today button.

**The shared law: the today screen is the only screen with a closed set** — things that cannot be deferred further — and its ordering axis is whichever one the product trusts. Calendars order by the clock. Task apps order by hand, and Things cuts it exactly once, at the evening.

## Centring

**Google documents the opposite of centring, verbatim.** "Responsive: Your calendar dynamically scales and enlarges events to fill larger monitors." Google spends extra width, and makes it a user setting rather than a design law.

**Fantastical and Sunsama spend surplus width on panes**, not on a wider column. Fantastical's sidebar is sized by the person — "a compact sidebar, larger sidebar, or no sidebar at all"; Sunsama's right panel is a togglable slot.

**Things' centring: not verified.** No statement from Cultured Code about width or centring. What is documented is adjacent — Slim Mode to "cut out distractions", and extra width spent on *more panes* ("Open multiple projects in their own panes").

**The rule this suggests:** content whose width is measured in **characters** gets a ceiling and centres; content whose width is measured along a **data axis** fills. A task list has a legibility ceiling, so extra pixels buy nothing and margin is the honest use. A time grid has no ceiling, because extra width buys resolution on the categorical axis — wider day columns fit titles, more columns fit more days.

That also explains why the width-rich products add a pane instead: **a second column of different content is the only other thing extra width can honestly buy.**
