# View switcher

One dataset rendered several ways, with a control that swaps the representation while the data,
filters and selection persist.

## This is not tabs

Carbon separates the two components by exactly one question — **is it the same content?**

> When navigating between distinct content areas like subpages, use tabs instead of a content
> switcher. Tabs follow the metaphor for sections in a filing cabinet, and two tabs wouldn't contain
> the same sheet of paper.

And the inverse, from the same system: "when toggling between different formats of the same content
or filtering the same content, use content switcher instead."

Same data, different form is a **switcher**. Different data is **tabs**. Getting this wrong makes
the filter bar lie: filters that survive a switch must not survive a tab.

## The shape it suits

A single homogeneous collection whose records carry several orthogonal dimensions — a date (→
[calendar](calendar.md)), a status (→ [board](board.md)), a field set (→ [data-table](data-table.md)),
an image (→ [gallery](gallery.md)).

**If the dimension does not exist on the records, the view cannot exist.** A board view needs a
single-valued status field; a calendar view needs a date. This is the cheapest check in the catalogue
and it is almost never made.

## Take it when

- One dataset is worth seeing more than one way, and different users want different ways.
- Filters and selection should survive the switch.

## Leave it when

- **The user must compare across views.** Carbon is blunt: tabs and switchers "should not be used if
  the user needs to compare information in different groups, as this would result in the user having
  to click back and forth".
- **It is a binary on or off.** Use a toggle.
- **It is progress through a linear process.** Use a [wizard](wizard.md).
- **More than six entries.** Carbon: "If more than six tabs are needed, consider other navigation
  patterns, such as a side-nav."

## Regions

| Region | May hold | May not hold |
| --- | --- | --- |
| Switcher | The mutually exclusive representations of one dataset; exactly one selected by default | Actions — "use a tab bar to support navigation, not to provide actions" (Apple); enough entries to overflow — "avoid overflow tabs... the More tab makes it harder for people to reach and notice content" |
| Shared bar | Filters, sort, search and selection that survive the switch — they belong to the dataset, not to the view | Per-view-only controls that vanish confusingly |
| View body | One representation, full width | A second switcher of the same dataset at the same rank |

## Width

The switcher has no published minimum; it is governed by its overflow rule — labels must never
truncate. The **views** set the floor, and they differ wildly: a board needs horizontal room a list
does not. Check the narrowest view, not the widest.

Narrower: horizontal scroll with a scroll button, then a dropdown of views.

## Costs

Only one view at a time, so comparison dies. View-specific state — column widths, board grouping —
multiplies. Hidden views are undiscovered views.

## Seen in

Notion (documents and databases) · Google Calendar (consumer productivity) · Jira (engineering) ·
Airtable (no-code data).

## Composition

Sits inside the content region of a sidebar shell, or inside a list–detail's detail pane. Each view
may itself be a table, a board, a canvas or a feed.

Two levels are legal only across **different kinds and ranks** — Material's primary plus secondary
tabs, or Carbon's tabs plus a content switcher "at a lower hierarchy". The same component inside
itself is forbidden. See [composition](composition.md).

## In a board

This is what `@core/view-group` is. The strip declares the views; each mounted child owns its own
props unless the manifest declares `gives`, in which case the parent feeds it.

The check that catches a fake switcher: if two views read different collections, you built tabs and
called them views, and the filter bar above them is lying about what it filters.
