# Supporting pane

A narrow region beside the main content holding properties, context or tools **for whatever is
currently selected in the main content**.

## The shape it suits

Material draws the line that everyone gets wrong:

> Use the supporting pane layout when the secondary content is only meaningful in relation to the
> primary content. For content with a parent–child relationship, use a list-detail layout instead.

An inspector's content is **dependent**, not **child**. Apple's test is behavioural: an inspector
"displays the details of the currently selected item, automatically updating its contents when the
item changes". If the contents stay the same when the selection changes, it is not an inspector.

## Take it when

- The user manipulates one object and needs its properties visible while doing so.
- The second region would be meaningless on its own.
- Filters that affect the main content need to stay put.

## Leave it when

- **The second region is a child of the first.** That is [list-detail](list-detail.md).
- **The second region means something alone.** Then it is a pane, not a support.
- **Below 600px.** Material sends supporting content below the focus pane, or into a sheet.

## Regions

| Region | May hold | May not hold |
| --- | --- | --- |
| Main | The object being worked on; its toolbar; its selection | — |
| Supporting | Properties of the current selection; filters affecting the main content; simple adjustment controls; stacked panel groups | **Controls needing multi-step input** — "avoid including controls that require typing text or selecting items to act upon because these actions can require multiple steps. Instead, consider using controls like sliders and steppers" (Apple); horizontally scrolling content — "a side sheet's narrow width leaves limited space to fully view items" (Material); a full data table; navigation for the app; content meaningful on its own |

Place it on the **right**, "to avoid interference with any navigational components on the left edge"
(Material).

## Width

Material fixes it at **360px** at the expanded breakpoint. Spectrum ships 304px and 240px. Carbon's
right panel is 256px.

Proportionally: **50/50 at medium** (600–839px), **70/30 at expanded** (840–1199px). Polaris says the
same in words — "the primary content occupies two thirds of the page".

Narrower: below the focus pane, then a bottom sheet, then a modal [drawer](drawer.md).

## Costs

Permanently narrows the main content. Empty and multi-selection states must both be designed. Tempts
teams into stuffing a form into 300px, which Apple's rule above forbids outright.

## Seen in

Figma (design tooling) · HubSpot CRM (sales) · Gmail side panel (email) · Chrome DevTools Styles
(developer tooling).

## Composition

May hold tabs within itself. The main region may hold a canvas or a single object.

It may **not** hold a list–detail, a nested inspector, navigation, or a data table — it has neither
the room nor an independent meaning. And note SAP Fiori's distinction in [composition](composition.md):
a main surface flanked by helpers is *not* a three-pane drill-down, even though they look alike.

## In a board

A `foldable` side box on the right, holding property widgets that read the main region's selection by
ref. The middle keeps `keep: true`.

The give-away that you built this and not a list–detail: the side region's widgets have no meaning
when nothing is selected — and so they need a designed empty state, per
[empty-state](empty-state.md).
