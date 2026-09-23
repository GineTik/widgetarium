# What one row carries, and what happens to it when the column narrows

Two products measured live in headless Chrome, 19 September 2026: GitHub's issue list (`github.com/microsoft/vscode/issues`) and Atlassian's public Jira (`jira.atlassian.com`, which runs the Data Center Issue Navigator, not Cloud). Measurements are computed values read from the DOM at stated widths, plus rules read out of the pages' own shipped stylesheets. **No pixel value here was not measured or published.** Everything else is documentation, attributed inline; anything unverifiable is marked.

## The five findings

1. **The title is the only elastic element. Everything else keeps its width and the row gets taller.** GitHub from 1440→768px: trailing metadata never moves or shrinks, the title's column collapses 832→210px, the row grows 64→179px.
2. **Trailing metadata sits on reserved fixed-width columns drawn even when empty, and they collapse all at once at one threshold — not field by field.** GitHub reserves four 45px slots at fixed x on every row; below 544px they stop being columns and rejoin the text flow.
3. **Almost nothing is ever dropped.** The three published narrowing strategies are *wrap* (Primer/GitHub), *scroll* (Jira's table, Notion's frozen column) and *restack into the mobile row* (Todoist's Mini view, Polaris `condensed`). **Per-field hiding under pressure is not a documented pattern in any product verified here.**
4. **A density toggle changes padding, never type.** Asana publishes it outright: compact mode "doesn't make the font any smaller, it just reduces some of the white space around each task name." No other product publishes a compact mode that touches font size.
5. **Which fields appear is decided by redundancy, not by space.** Things hides a tag a to-do inherited from the list it is in; Linear, Asana, Jira and Notion make per-field visibility a property of the *view*. **The row draws what the surrounding screen has not already answered.**

## GitHub's issue row, measured

At 1440px, row content width 1134px:

| Element | Position | Always? |
|---|---|---|
| State icon, 16×16, green | x297 | always |
| Title, 16px / 600, `#1f2328` | x321 | always |
| Labels, 20px tall, 12px text, `border-radius: 9999px` | inline **inside the title block**, same left edge, wrapping | conditional |
| `#number`, 12px / 400, `#59636e` | second line, x321 | always |
| `·` author · "opened" · relative time | same second line, same tier | always |
| **Four trailing slots, each exactly 45px, 53px pitch** | x1191 / 1244 / 1297 / 1350 | **columns always present, content conditional** |

Row height **64px** with a one-line title and no labels; **85–88px** with labels. Empty slots still occupy their 45px.

**The weight order is three steps against one secondary tier.** Title vs everything: size 16 vs 12 (1.33×), weight 600 vs 400, colour `#1f2328` vs `#59636e`. There is no third tier — number, author and timestamp are all in the same muted 12px line. The only other saturated colour on the row is the 16px state icon. Labels carry their own colour but are small and pill-shaped, so they read as texture beside the title rather than as competition.

**The narrowing, measured on one row:**

| Viewport | Row width | Title column | Row height | Trailing slots |
|---|---|---|---|---|
| 1440 | 1134 | 832 | 85 | 4 × 45px at fixed x |
| 1200 | 894 | 579 | 88 | 4 × 45px |
| 1000 | 710 | 375 | 112 | 4 × 45px |
| 860 | 570 | 288 | 133 | 4 × 45px |
| 768 | 478 | 210 | 179 | 4 × 45px; "opened <time>" wraps to its own line |
| 560 | 526 | — | 157 | 4 × 45px |
| **530** | 496 | — | 136 | **columns gone** — empty slots `display:none`, chips rejoin the flow at x57 / x91 |

The threshold is in the page's own CSS, at Primer's `small` breakpoint:

```css
@media screen and (width >= 544px) {
	.IssueItem-module__ListItem_0 { flex-wrap: unset; }
	.IssueItemMetadata-module__ListItemMetadata_0 { width: 45px; height: unset; }
}
```

**Wrapping is the base state and the fixed columns are the enhancement.** The mobile row is the default; the desktop grid is layered on. Nothing is ever removed — labels wrap, the title wraps, the secondary line wraps, and the metadata chips shrink to content. This matches Primer's published rule: "If you must truncate, consider wrapping the text, as opposed to truncating or relying on horizontal scroll", and "Do not truncate text if it contains focusable elements such as links, buttons, and mentions/tags."

Hover, from the shipped CSS, reveals a trailing action on **`:hover, :focus-within`** — the hidden control is reachable by keyboard. Selection is an `aria-checked` checkbox, never a hover-only affordance.

## Jira, measured — the two extremes in one product

**Detail view, a 252px list pane beside an issue.** The row carries **exactly three things**: type icon (16px), key (12px, link blue), summary (14px) on the line below. Row height 54px. Assignee, status, priority, dates and votes — all present in the table view — are simply absent. **The reduction is chosen by pane width, not window width.** This is the most aggressive reduction measured anywhere.

**Table view, 12 columns at 1440px:** `T` 51 · `Key` 143 · **`Summary` 320** · `Assignee` 100 · `Reporter` 104 · `P` 40 · `Status` 162 · `Resolution` 94 · `Created` 102 · `Updated` 102 · `Votes` 66 · `Development` 110. All cells 14px / 400 — **no weight, size or colour hierarchy at all**; ranking is column order alone. Every cell is `overflow: hidden`; only Summary wraps, every other cell clips.

**Narrowing: nothing happens.** At 900, 600 and 375px every column stayed at the same x and the same width and the document scrolled horizontally. Atlassian's own design system contradicts what the legacy navigator ships: "Never truncate text", and if you must, "make sure that there's another option for people to expand and read the text."

## The design systems, because the products do not publish the rule

**Material 3, Lists** — the only published required/optional split found: "Container and label text are required. All other elements are optional." Alignment is a law: "Place supporting visuals and primary text in the same position in each list item", "Don't vary the position of elements within a list." Overflow: "Limit supporting text to one to three lines" and "Truncate supporting text, depending on screen size" — **the supporting text is the truncation budget, never the label.** Weight is spatial: "Use spacing to draw attention to the most important aspect of the list item."

**Apple HIG, Lists and tables** — when a row cannot hold the content, move it out of the row entirely: "you could list item titles only, letting people choose an item to reveal its content in a detail view", which is exactly what Jira's 252px pane does. And: "Sometimes, an ellipsis in the middle of text can make an item easier to distinguish because it preserves both the beginning and the end."

**Shopify Polaris, IndexTable** — the clearest published restack: in `condensed` the table stops being a table and becomes an unordered list of stacked key-value pairs, driven by a breakpoint (~490px). The published trade-off is named: condensed drops bulk actions, so use it only where multi-select is not essential.

## Can field priority be derived rather than authored?

**Partly — and the part that derives is the part that matters.**

Derivable:

1. **Rank by how much the field changes the reader's next action, then subtract what the screen already answers.** Every verified conditional field is conditional for the second reason: Things hides the inherited tag; Linear's display options exist so a view grouped by status stops drawing status; Asana's pitch is hiding "tags that aren't relevant". **An engine that knows the grouping key, the filter and the region title can derive that demotion without being told.**
2. **Rank by width behaviour, which is a property of the type.** Fixed-width glyphs (state, type, priority, avatar) survive to the narrowest layout measured in both products; variable-width text (author, timestamp, project) wraps first; the single unbounded text field absorbs all the slack. That ordering fell out of measurement in two unrelated apps and is codified in Material and Primer.
3. **Rank by identity versus description.** What survives Jira's 252px pane is type + key + summary: what the thing *is*, what it is *called by*, what it is *about*. Counts, people and dates are description and go first.

Not derivable, authored everywhere: **which optional fields exist at all** (Linear, Asana, Jira, Notion and Height all ship a picker; none infers it); **the trailing column budget** (GitHub's four 45px slots are reserved when empty precisely so the grid is stable, which no derivation produces); **the collapse threshold** (GitHub reuses its design system's 544px, Polaris uses `smDown`, Todoist names an alternative layout).

**The rule an engine can run:**

> Give the anchor all the slack and let the row grow taller. Put the rest in two tiers: a **glyph tier** (fixed-width, leading edge, never dropped) and a **metadata tier** (one muted line at ~0.75× the anchor's size, plus a fixed-width trailing strip). At **one** threshold, stop reserving the strip and let its contents rejoin the metadata line — do not hide fields one at a time. Before any of that, demote every field whose value the region or the grouping already states.

The one production system known to rank fields by an explicit priority number is Linear's `ResponsiveSlot` — resize-observer-backed, each slot carrying a `priority`, lower priorities rendering `null` first. The only public account is a reverse-engineering post about the **header**, which also concludes it probably never fires for want of a `min-width: 0`. That is the honest state of the art: **priority-ranked field dropping is a plausible idea with no verified shipped example.**

## Negative findings

- **No product publishes a drop order.** Not Linear, Asana, Todoist, TickTick, Notion, Things, Height, Spark or Superhuman. GitHub's and Jira's behaviour is measured, never written down.
- **No product publishes row pixel specs** — no heights, no font sizes, no gaps. Asana's compact-mode statement is the only published density fact found, and it is a negative one.
- **No product publishes an alignment rule.** That GitHub puts trailing metadata on fixed invisible columns is only visible in the DOM. Material publishes the rule, but Material is not a product.
- **No product publishes a hover contract for rows** — despite Primer separately publishing that tooltips fail keyboard and speech users, so a tooltip is not a legitimate home for a dropped field.
- **Nobody publishes a maximum.** Asana's cap of 20 custom fields on the main project view is the only ceiling found, and it is a product limit rather than a legibility rule.
- **Superhuman and Spark publish nothing about their row's anatomy.** Do not cite them for it.
