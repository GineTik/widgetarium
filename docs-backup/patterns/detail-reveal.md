# Detail reveal

Where a single record's detail is revealed and edited, relative to the set it came from.

## The shape it suits

One record that must be opened out of a set the user is working through. Four variables settle
which mechanism: how many fields, whether the surrounding set must stay visible, whether the
edit must be atomic, and how narrow the container is.

## Take it when

- The set is the context for the decision, and the record has more in it than a row shows.

## The comparison

| Mechanism         | Right when                                                                          | Fails when                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inline**        | "Works only for narrow tables"; one field; edit mode visually distinct              | More than one field; validation can fail — there is nowhere to put the error                                                                                                 |
| **Modal**         | The task "requires focused attention and a separation from the main workflow"       | It "obscures adjacent records, limiting reference data access"; multi-step flows                                                                                             |
| **Side panel**    | "Allows simultaneous viewing of the record and table data"                          | Narrow windows; when the detail itself needs a table                                                                                                                         |
| **Row expansion** | "Helps present large amounts of data in a small space"; defers queries until needed | "Users tend to not clean up after themselves"; "users will have difficulty referring to records that are not in immediate proximity"; expanding all rows defeats the purpose |
| **Own page**      | Many fields, several steps, referenceable content                                   | Loses the set; breaks the scan-edit-scan rhythm                                                                                                                              |

## Leave it when

- **Modal is wrong whenever the user needs the list to decide.** This is the most common misuse: an
  edit dialog hiding the comparison the edit depends on.
- **Inline is wrong the moment there are two fields.**
- **Row expansion is wrong when rows are opened repeatedly** — the layout below keeps moving.
- **A side panel is wrong in a narrow window** — it becomes a modal with extra steps.
- **A full page is wrong for a one-field change** — the open-save-return tax exceeds the edit.

## Width

The panel's viability is arithmetic: the panel plus the remaining set must both stay usable.
**50/50 at 600–839px, 70/30 at 840–1199px, and below 600px there is no panel — only an overlay.**

Apple's equivalent: "prefer using a split view in a regular — not a compact — environment", and "set
reasonable defaults for minimum and maximum pane sizes... if a pane gets too small, the divider can
seem to disappear".

And a depth cap: designs exceeding two levels of disclosure "typically have poor usability because
users become lost navigating between levels". A drawer that opens a modal that opens a drawer is over
the line.

## Costs

Every choice here trades context against focus. There is no option that gives both.

## Seen in

Gmail inline actions versus full compose (email) · Jira issue drawer over the list (work tracking) ·
Stripe payment detail panel (payments) · Airtable expanded record (data) · Figma inspector (design
tooling).

## Composition

The panel is a property of the **shell**, not of the content: it sits outside the responsive grid,
full height, beside a table, a board, a feed or a calendar.

It may not contain another panel, and it may not contain a full data table.

## In a board

Widgetarium has no overlay for this. What it has instead is better for most cases: a collapsing
region that is _already_ the detail, fed by a ref from the list — a permanent panel rather than a
summoned one.

Use that first. Reach for a widget's own dialog only when the edit is genuinely atomic and the set
does not need to stay visible.
