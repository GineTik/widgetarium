# Calendar and timeline

A layout whose primary axis is time, where an item's position and extent encode when it happens and
how long it lasts.

## The shape it suits

Items carry a timestamp or an interval, and that timestamp is what the user reasons about. Two
sub-shapes:

- **Calendar grid** (day / week / month): time is two-dimensional. Suits items **dense enough to
  collide**, where the collision itself is the information — double-booking, free gaps, load per day.
- **Timeline or Gantt**: time on one axis, entities on the other. Suits intervals with duration and
  dependency.

## Take it when

- Events are dense enough that overlap and gaps carry meaning.
- The question is genuinely "when", not "what next".

## Leave it when

This pattern deserves the sharpest refusal in the catalogue, because it is the most over-applied.

- **Events are sparse.** A month grid reserves 30 equal cells whether they hold nine items or none.
  With one or two a week, most of the pixels encode nothing. Published counsel: "do not use a
  calendar view if the content of your website does not have its root in a given period of time",
  and even where it works, "consider supplementing the calendar with a list".
- **Events are extremely dense.** "A grid packed with multiple events per day becomes a chaotic
  mess." Both ends fail; the calendar's viable band is the middle.
- **The question is "what's next?"** A sorted list answers that in one glance. A grid makes the reader
  search for it.
- **Time is not what distinguishes items.** Then time is a column, not a layout.
- **Gantt specifically**: it assumes "well-defined and predictable timelines", and once drawn "it can
  be challenging to make changes without disrupting the entire project schedule".

## Regions

| Region | May hold | May not hold |
| --- | --- | --- |
| Axis header | Weekday or interval labels | — |
| Cells | Event chips, truncated with a count when they overflow | More chips than fit — the "+3 more" is the signal to change view, not a solution |
| Companion list | An agenda beside or below the grid, answering "what's next" | — |

## Width

Column count is fixed by the view, not by taste: day = 1, week = 7, month = 7 × 5–6. So the minimum
width is **7 columns of readable chip**, where a chip that is tappable obeys the 24px floor.

**If the container cannot afford seven columns, the calendar cannot shrink — it must become an agenda
list.** That is the degradation, and it is a change of pattern, not of size.

A month cell holds roughly 2–4 chips before truncation.

## Costs

Fixed cell area regardless of content: cells truncate exactly when the day is most interesting.
Enormous minimum width. Poor at long spans — a year is not drawable at event granularity. Poor for
comparing durations of non-adjacent items.

## Seen in

Google Calendar and Outlook (scheduling) · Calendly and OpenTable (booking) · Gantt views in Jira and
Asana (project work) · editorial calendars in CMSs (publishing) · shift rosters (workforce).

## Composition

Main region only. A month grid must **never** go in a supporting pane or inspector — its seven-column
minimum exceeds what a pane can give.

A *mini* month calendar used as a date picker is a different component and does belong in a sidebar.
Do not confuse the two because they look alike.

## In a board

The most common way this pattern goes wrong here: a month widget with no `maxSize.w`, placed in the
`keep` column, stretched to the full board width, showing almost no events.

Before placing a calendar, check two things. Does the data actually collide? And does the widget cap
its own width? If the answer to either is no, place an agenda list instead and say why.
