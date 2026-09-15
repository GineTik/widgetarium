# Data table

A dense rectangular grid of records × attributes, with a filter layer above it and a way to open one
record without losing the set.

## The shape it suits

High cardinality. Items are strict peers with **identical** attribute structure. Order is
user-controlled. The user both scans the set and selects members.

Nielsen Norman names four tasks a table supports: find records fitting criteria, compare data, view
or edit a single row, act on records. **If your data does not have all four, you may not need a
table.**

## Take it when

- Records share a structure and must be compared along columns.
- The set is large enough that sorting and filtering earn their chrome.

## Leave it when

- **Records are heterogeneous.** Half the cells will be empty and the table lies about structure.
- **There is no comparison task.** Cards beat tables for browsing.
- **Under about five rows.** The toolbar, headers and pagination outweigh the data.
- **In a narrow container.** This is a published prohibition, not a judgement call — see Width.

## Regions

| Region | May hold | May not hold |
| --- | --- | --- |
| Toolbar | Search, filters, bulk actions — **up to five**, the rest into overflow | A sixth visible action |
| Header | Column titles of one or two words, wrapping to two lines then truncating with the full text on hover | Long titles that force truncation by default |
| Body | Rows at one of five heights, with the header matching the row size; hover highlight always on, "as it can help the user visually scan the columns of data in a row" | Another table |
| Pagination | Always at the bottom | — |

## Width

Carbon states the rule that settles the sidebar question:

> Data tables should be placed in a page's main content area and given plenty of space to display
> data without truncation. Avoid placing data tables inside data tables or smaller containers where
> the information can feel cramped or needs truncation.

And: "consider giving your data table the most width on the page to help your user view dense data."

So a table is a **width taker**: anything sharing its row is a width giver. In a narrow container the
legitimate substitutes are a list, a structured list, or a two-column key/value pane.

## Costs

The narrowest viable container of all patterns. Degrades badly below tablet width. Visually
monotonous. Filters add hidden state — "users must clearly see when filters are active".

## Seen in

Jira and Linear issue lists (software work) · Stripe payments (finance) · Salesforce record lists
(CRM) · Airtable and Notion database views (general) · cloud resource consoles (infrastructure).

## Composition

Main region only, the widest element on the page. Its detail companion is a nonmodal side panel, so
the set stays visible — see [detail-reveal](detail-reveal.md).

Never inside a sidebar, a supporting pane, a tile, or another table.

## In a board

A table widget takes the `keep` region and wants all of it. If a board has a table, the table decides
the width and everything else adapts — that is what "width taker" means in practice.

Do not put a table widget in a `foldable` side box. It is the one placement the sources forbid by
name.
