# Cards

In this system most of the page stands without cards. A card appears only to group something, to make one thing pressable, or to summarise. Lines, plates and padding follow `clean-ui.md`.

## When a card, and when not

| Content                                          | Card or not                                                                       | Kit                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------- |
| A table                                          | **no card.** Edge to edge in its region; header row on sunken; lines between rows | `DataTable` / `Table`        |
| A calendar, a board of lanes, a timeline         | no card, edge to edge                                                             | `Calendar`, lanes as columns |
| A list on the page                               | **no card.** Rows on the page, a line between them, a mark leading each row       | `ItemGroup` of `Item`s       |
| A list in the aside, beside other aside blocks   | one card holding the rows                                                         | `Card` around an `ItemGroup` |
| A strip of 3–5 figures                           | **one** card split by vertical lines                                              | one `Card`, cells divided    |
| Facts of one record                              | one card, label left in ink-2, value right                                        | `Card` with `Row`s           |
| A summary with one job (quota, total, next step) | a card                                                                            | `Card`                       |
| The one block the page is for (a total)          | may invert: ink card, page-coloured text; one per page                            | `Card`                       |
| Headings, prose, forms, filters                  | no card                                                                           | —                            |

## Pressable and still cards

- **A pressable card** is one thing you open: a project, an article, a result. The whole card is the link; it gets the hover fill; it holds no second button that competes with it.
- **A still card** only groups: facts, a summary. No hover; its actions are small buttons inside.

## Anatomy

- Heading-role title with a count in ink-3 · an action link right (`Open →`) · content · no footer unless it holds the card's one action.
- Variants: `default` (the 3% plate) and `accent` (ink, page-coloured text), one accent per page. TODO: the kit's `Card` has no `accent` variant yet.
- Radii step with size: 4 chips · 6 menu items · 8 buttons and inputs · 12 cards · 16 dialogs and sheets · full for people and counts.
- Shadows only on what floats (popovers, sheets, dialogs); with `edges: outline` a card has a line instead of a fill.
- TODO: the kit's `Separator` stops at a card's padding; `clean-ui.md` needs it to bleed to the card's edges.
