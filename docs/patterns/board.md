# Board

A horizontal series of named, ordered bins where every item sits in exactly one bin, and moving it
between bins is the primary act.

## The shape it suits

Moderate cardinality — tens per column. Items are peers **within** a column, but the columns are an
ordered lifecycle, not arbitrary categories. Order within a column is meaningful.

The user selects one item to open, but the characteristic action is **transition**, not selection.

The controlling fact: the item's state is a **single enumerated value**. That is what lets the board
guarantee one bin per item.

## Take it when

- Items move through named stages and the movement is the work.
- Imbalance between stages is worth seeing.

## Leave it when

- **The grouping attribute is multi-valued.** An item belonging in two columns breaks the only
  invariant the pattern has.
- **The columns are not a progression.** If reordering them changes nothing, you have a filtered list
  with extra chrome.
- **Cardinality is high.** Columns scroll independently and the count per column stops being
  readable. The workflow answer is a WIP limit — Atlassian's sample projects cap in-progress at five.
- **The task is comparison across attributes.** A card shows three to five fields; a table shows
  fifteen.
- **The window is narrow.** Horizontal panning plus vertical scrolling in one view is the worst
  navigation geometry there is.

## Regions

| Region | May hold | May not hold |
| --- | --- | --- |
| Column header | The stage name and a count | — |
| Column body | Homogeneous cards, same size, same variant — "do not mix different variants of tiles in groups" | Cards of different shapes per column |
| Card | Three to five fields, the ones that decide the move | The whole record |

## Width

**Columns × minimum card width + gutters ≤ container width**, or the board is wrong for this
container. With a 180px floor for a readable card, a 1200px region holds about six columns before
cards stop being usable.

Narrower: fewer columns is not an option — the columns are the data. It degrades to a grouped list.

## Costs

Very low information density per pixel. The horizontal axis is finite and non-negotiable: every added
column shrinks all the others. Sorting across columns is impossible. Bins with wildly different
populations look broken even when correct.

## Seen in

Trello and Jira (project work) · GitHub Projects (software) · Notion and Airtable board views
(general) · hiring pipelines in an ATS (recruiting) · sales pipelines in a CRM (sales).

## Composition

Main region, edge to edge — it wants more width than anything except a table. Never in a sidebar or a
pane. Never nested inside a tile.

It may host a detail drawer, by the same rule as a table: nonmodal, so the board stays visible.

## In a board

A kanban widget takes the `keep` region whole. Its column count comes from the data, so its width
requirement is derived, not declared — which makes it one of the few widgets where a `maxSize.w` is
genuinely wrong.

Check the arithmetic before placing it: if the region cannot give six columns their minimum, place a
grouped list instead and say so.
