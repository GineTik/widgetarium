# Layouts in five issue trackers

Jira (Cloud + Product Discovery), Linear, Asana, Trello, Height. Vendor documentation unless marked; Height's own docs refused every fetch, so its entries are search snippets and a third-party review.

## What all five do

1. **A fixed left rail beside one fluid main region.** Jira's LeftSidebar is 250px; Linear's, Asana's, Trello's and Height's are the same shape. In four of five the rail **collapses to nothing** rather than narrowing — Jira's full screen, Linear's `[`, Asana's auto-collapse on small screens, Height's collapse. Only one region is allowed to be elastic, so navigation stays at a memorised position across every screen and the eye re-finds it without reading.
2. **A row of N equal columns of stacked cards.** Always level 2, always with the grouping variable on the horizontal axis. **Column height itself becomes the readout** — "where is the pile" is answered without reading a card.
3. **A single scrolling column of rows cut into labelled, collapsible bands.** Jira's sprints, Linear's group headers, Asana's sections, Trello's list, Height's spreadsheet groups. One column = one total order, which is what ranking requires.
4. **A view swap over one data set, at one location.** Jira's switcher, Linear's `Cmd/Ctrl B`, Asana's tabs, Trello's view switcher, Height's view menu. **The swap always preserves filters and place; it is never a separate destination.**
5. **Detail shown beside or over the list, never instead of it.**

## The dialog and the side panel are two different perception jobs

Jira exposes both over the same content, chosen by a setting: from a board, an item opens as a **centred dialog**; "Open work items in sidebar" moves it to a **right panel** instead.

**The dialog says *stop and read one thing*. The panel says *keep the list, compare against it*.**

The refusal proves it: the backlog's J/K walk always uses a panel, never a dialog, because a modal would break the walk. Trello's card back is deliberately the other pole — a non-resizable overlay with the board behind it inert, a stop-and-read surface.

## A card is a fixed-slot comparison unit, and prose is refused

Linear states it outright: "Descriptions are not shown on cards. If an issue has many properties, not all properties may have space to be displayed on the card."

**Uniformity is enforced on the slots, not on pixel height.** Cards vary in height with content; the *field set* is uniform. That is what makes a column of cards a de facto table — the eye compares position, not labels.

## Columns stay equal; the escape hatch is removal, never a different width

- **Trello** lets a column collapse to a header strip keeping **name and card count** — the two facts that make a column comparable are exactly the two kept.
- **Linear** lets a column be hidden, and pushes it to the end rather than deleting it.
- **Asana** permits neither and keeps every column equal at the price of horizontal scroll (a long-standing feature request).
- **Column resizing: not verified in any of the five.**

**Chart grids are the one place unequal cells are allowed, and only in fixed steps.** Asana: half or full width, max 20 charts — a two-step system, so rows still align. Jira: a preset column layout (2 vs 3) sets one width for every gadget in a column; gadget height follows content; **free placement is not offered**, which is what stops a dashboard becoming a collage.

**Calendars are the strict case** — equal day cells with no exceptions, which is exactly what lets "how full is this day" be read as area. **Timelines are the strict opposite** — cell width encodes duration, and Trello's lane packing ("A lane can be shared by various cards as long as they don't share the same period of time") means vertical extent encodes **concurrency**, not count.

## Centring appears only on read-a-document surfaces

In all five, collection views are full-bleed inside their pane. **No product centres a board, list, table, timeline or dashboard.**

**Linear is the one product that centres and states why.** "We're now centering the issue content when your window size grows beyond a certain size. The issue details panel will also grow proportionally with your screen size." The reason given: they "didn't want to make the issue content column too wide" for readability, having previously widened the details pane instead, which "never looked quite right on larger window sizes".

So: cap the prose measure, and **give the surplus to the metadata rail instead**. Below that window size the content is not centred — centring is a response to surplus width only.

**Asana treats the measure as a per-person setting**: the full-screen task offers narrow / description / wide, defaulting to wide, preference persisted — because the same pane serves note-taking (wants width) and reading (wants a short line). Whether those modes are centred: not verified.

**The negative finding is the useful one:** where width is surplus, these surfaces either show more columns and rows, or hand the surplus to a metadata rail — **never to empty gutters**.

## Pane content re-scoped by width, rather than shrunk

Trello's Planner: "your Planner will automatically show calendar events from a single day, 3 days, or 7 days based on the size of your browser window."

**The layout changes how much time it shows rather than shrinking the cells** — so a day column never drops below legibility. The cleanest example in this batch of content *scope* responding to width, as opposed to content *size*.

## Two columns for a record: prose left, fields right

Jira's work item: description column on the left, context fields "down the right side of the work item (**or at the bottom in a single-column layout**)", grouped Pinned / Details / More fields.

**At narrow width the two-column form is abandoned rather than squeezed** — a field rail thinner than its labels reads as noise. Separates what is read continuously from what is scanned and edited point-wise.

## Density is a spacing decision, never a type decision

Asana's compact mode: "makes each task row a little shorter, so you can see more tasks on the screen at one time. **This doesn't make the font any smaller**, it just reduces some of the white space around each task name."

## Peculiar to one product, and worth knowing

- **2-axis scatter with sized bubbles** — Jira Product Discovery's matrix. Three ranked variables read at once as position plus area; a list would need three sorted passes. Refused as a complete inventory: items with no value on either axis "don't appear in the plot", so the list view stays the place where nothing is hidden.
- **Three arbitrary surfaces side by side, person-composed and divider-resizable** — Trello's Inbox | Planner | Board. Everyone else's multi-pane layouts are fixed compositions. Opt-in per combination, because each pane costs the others width.
- **An analysis panel docked in the right sidebar of the very list it summarises** — Linear's Insights. The aggregate sits beside the instances, so a filter change is seen in both at once.
- **Packed timeline lanes** — Trello only.
- **Map with pins** — Trello only.

## Not verified

Column resizing in any of the five. Trello's and Linear's dashboard grid geometry. Height's UI beyond search snippets. Jira's max content width. Whether Asana's width modes centre.
