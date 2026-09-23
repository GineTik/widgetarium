# Layouts in five desktop system apps

Finder, System Settings, Terminal / iTerm2 / Warp, Raycast, Activity Monitor. Apple's HIG is served as JSON behind the rendered pages; that is what was read.

## Finder's four views — the clearest proof that arrangement is chosen by perception

Same data, same window, four arrangements. None differs in capability. They differ only in **which channel the eye gets to use**.

| View | The question it answers | What only it can do |
| --- | --- | --- |
| **Icon** | what does it look like | appearance is the primary channel; the only view where an item can be placed by hand |
| **List** (an outline, not a table) | how does it compare | one attribute on a shared axis with a shared baseline; sorting; two branches expanded at once |
| **Column** | where is it | depth becomes a spatial axis |
| **Gallery** | what is inside it | the file's *contents*, not its icon, legible at size |

Apple states the refusals, which is the valuable half:

- Grid is refused for text: *"Prefer displaying text in a list or table… If you have items that vary widely in size — or you need to display a large number of images — consider using a collection instead."*
- Outline versus table: *"Use a table instead of an outline view for non-hierarchical data."*
- Hierarchy lives in one column only: *"Expose hierarchy in the first column only — other columns display attributes applying to the hierarchical data in the primary column."*

### Column view, and what it makes visible that a tree does not

A horizontally scrolling row of columns; column *n* is the full sibling set at depth *n*. Apple: *"Consider using a column view when you have a deep data hierarchy in which people tend to navigate back and forth frequently between levels, and you don't need the sorting capabilities that a list or table provides."*

Four consequences, each straight from the geometry:

1. **Depth is position, not indentation.** In an outline, depth is leading whitespace and must be measured against neighbours. Here depth *is* the x coordinate.
2. **Every ancestor's siblings stay visible.** An outline pushes a parent's own siblings above and below its expanded children, separated by however many descendants were opened.
3. **Exactly one path is shown, always.** An outline accumulates expansion state — Apple tells outline views to *"store and restore which levels users expanded"* — so the screen becomes the union of every branch ever opened. A column view has no expansion state and never needs tidying.
4. **The leaf gets a region of its own.** The inspector is not an extra pane; it is the last column — the terminal element of the same axis.

Refused when sorting matters, when the hierarchy is shallow, and on every platform without a wide resizable window: *"Not supported in iOS, iPadOS, tvOS, visionOS, or watchOS."*

## Grouped rows — one plate around many bare rows

System Settings' detail pane: one vertical scroll, rows stacked inside rounded plates, plates separated by a gap larger than the separators inside them, a header above and explanatory footer below.

HIG Layout: *"Group related items to clearly express related information or functions. Use negative space, container shapes, or separator lines to show which elements are related and which are unrelated."* Lists and tables: *"the grouped style uses headers, footers, and additional space to separate groups of data."*

**The gap between plates does the work a heading would otherwise do.** SwiftUI's `Form` is *"a container for grouping controls used for data entry, such as in settings or inspectors"* and `Section` *"further organize[s] related settings within a form"*; on macOS *"Forms appear as aligned vertical stacks"* — the alignment of every label/control boundary is itself part of the grouping.

**Apple states no mechanical rule for what puts two rows in one plate.** Read off the product: two rows share a plate when they qualify **one subject**, and the plate breaks where a row would change the meaning of the rows above it. That is inference, not Apple's wording.

The row itself is label-leading, control-trailing, which makes a plate scannable as two aligned columns: the left reads as a list of questions, the right as a list of current answers.

## Sidebar depth is capped at two

*"Show no more than two levels of hierarchy in a sidebar… When a data hierarchy is deeper than two levels, consider using a split view interface that includes a content list between the sidebar items and detail view."*

And on keeping orientation across panes: *"persistently highlight the current selection in each pane that leads to the detail view."*

## The terminal: one axis, and it is time

The data is **totally ordered and causally chained** — line *n* happened before line *n+1*, and frequently because of it. A column is the only arrangement where adjacency means "next", so reading order and causal order coincide with no legend. The second axis is already spent on the content of the line, and the items have no comparable attributes to align.

The strongest evidence that the axis is time and only time: Warp rethought the terminal and kept one axis, re-parameterising only its **direction** — classic (stack above the prompt), reverse (latest first), Warp mode (flow up and out of view). Its most aggressive restructuring stops at cutting the column into **blocks** of one command plus its output, *"divided by thin horizontal lines"* — still a stack, restoring object boundaries without adding an axis.

**A split means two different things here, and the products disagree — which is the answer:**

- **Terminal.app** splits into two viewports onto **one session**: *"The two panes mirror the same command, but now you can scroll to different positions within each pane."* That is the editor meaning — one document, two scroll positions. (O'Reilly, not Apple.)
- **iTerm2 and Warp** split into **N independent sessions**. Two unrelated streams made simultaneously observable, which the column cannot otherwise do because interleaving two processes into one column destroys the causal reading of both.

A split is never used to show a *different rendering* of the same stream. Splits are for **simultaneous**; tabs are for **resident**.

## Raycast — centring means unattached

A rounded panel of fixed width, centred horizontally, upper-middle of the screen, floating over whatever is frontmost. Which display is a setting; it is positioned against the **screen**, never a window.

The panel has **no parent to be positioned relative to.** It does not belong to a document, a window or an app, so no edge it could anchor to would mean anything — and it must be found instantly by a user whose eyes are somewhere unknown. Centring is the position that costs the same from every starting point and carries no claim about what the thing is attached to.

Apple's documented precedent: the alert, the other view that owns all input and belongs to no region, is centred on every platform — *"iOS/iPadOS/macOS/visionOS: Centered in the middle of the screen"*, and in visionOS *"centered in the wearer's field of view."*

**So: centring is not emphasis, it is absence of attachment.** A region is centred exactly when it has no sibling it is adjacent to and no container it is part of. A centred thing inside a populated layout is claiming a detachment it does not have. (Raycast does not state this itself — the reasoning is inference from the alert precedent and the screen-positioning.)

Raycast's other rule, worth stealing: **one fact appears in exactly one region.** *"It's recommended to omit accessories when using detail views, placing that information in the detail pane instead."* And its grid rule is a perception rule, not a data rule: use a grid *"when the defining characteristic of an item is an image"* — which is why columns and aspect ratio are exposed at all.

## Activity Monitor — why a table and not cards

The question asked of this screen is never "tell me about this process". It is always comparative and rank-ordered on **one numeric attribute at a time**.

A table is the arrangement where one attribute of every row shares an axis, a scale and a baseline, so magnitude reads as horizontal offset of digits and ranking is perceivable without reading any number. **Cards destroy exactly that** — each card gets its own internal layout, the same field lands at a different x in every card, and comparison degrades from a glance to *n* reads.

Apple states both halves: *"Prefer displaying text in a list or table. A table can include any type of content, but the row-based format is especially well suited to making text easy to scan and read"*, and for the cross-column problem, *"Consider using alternating row colors in a multicolumn table… to track row values across columns."* The collection is reserved for the opposite case — *"ideal for showing image-based content"* — and a process has no appearance.

Second reason: the set re-sorts every five seconds. A row is the cheapest object that can be re-ordered in place without the eye losing the set; cards reflowing every five seconds would be unreadable.

**Graphs are refused inside rows.** Time series live only in the bottom strip or a separate window. A per-row sparkline would put a second scale in every row and break the shared axis the table exists for.

The bottom strip holds the **totals the rows sum into** — a per-process number is meaningless without its denominator on screen, and it must be readable peripherally while the eye works in the table. Apple's own guidance argues against the position (*"people often relocate a window in a way that hides its bottom edge"*), and the app uses it anyway — the tell that totals are treated as content, not chrome.

## The table this batch yields

| Arrangement | Chosen when the question is | Documented refusal |
| --- | --- | --- |
| Split (rail + detail) | where am I, and what is here | deeper than two levels → insert a content list |
| Inspector pane | what is this one | never twice on screen |
| Grouped rows | what is the state of these | never for the rail itself |
| Table / outline | which one, ranked by an attribute | image-first or wildly varying content |
| Grid / collection | which one, by appearance | text-dominant content |
| Column browser | where is this in the hierarchy | when sorting is needed; macOS only |
| Stream, one axis | what happened, in order | never given a second axis, even by Warp |
| Centred floating panel | act on anything, from anywhere | refused a persistent rail |

Two rules generalise: **a fact appears in exactly one region**, and **centring means unattached**, so it belongs to a screen-level surface and nowhere inside a composed board.
