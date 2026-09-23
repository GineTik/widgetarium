# What Apple and Material state as rules

Apple HIG read from the `tutorials/data/…json` source, so Apple quotes are the page text verbatim. Material 3 is a client-rendered SPA and was read in a browser.

This is the batch that *states* rules rather than only demonstrating them — and several of them are laws this project already holds, arrived at independently.

## The card container is the only required element

Material, verbatim: **"The card container is the only required element in a card. Card layouts can vary to support the kinds of content they contain."** The slots shown are Container, Image, Button, Supporting text, Subhead, Headline, and **"All other elements are optional."**

Sizing is content-driven, not grid-driven: "Card containers hold all card elements. Their size is determined by the space those elements occupy."

**So a card is one shape with optional parts, not a family of named variants.** A "header + body + buttons + media" card is the same card as a "media + header" card.

### The three variants carry no function

> "There are three card variants: Elevated, Filled, Outlined. **Each provides the same legibility and functionality, so the variant you use depends on style alone.**"

Ordered by separation from the background: **filled < elevated < outlined.** Material denies outright that the axis carries meaning.

### The negative rule, which is this project's escape ladder

> **"Don't force content into cards when spacing, headlines, or dividers would create a simpler visual hierarchy."**

And in a set: "By default, cards in a collection are coplanar. They share the same resting elevation unless they're picked up or dragged." Filters belong outside: "Filter or sorting options should be placed outside of the card collection."

Dividers inside a card have their own rule: full-width for content that can be expanded, inset to separate related content.

### Apple has no Cards page, and what stands in its place is telling

Three things, none of them a decorated box:

- the **inset-grouped list section** — the plate, defined in the API as `UITableView.Style.insetGrouped`, "A table view where the grouped sections are inset with rounded corners"
- the **collection** — "ideal for showing image-based content"
- **materials** — "a visual effect that creates a sense of depth, layering, and hierarchy"

**In Apple's vocabulary a plate is a grouping of rows or a material layer, never a box you drop arbitrary content into.** And Apple pushes text out of collections entirely: "It's generally simpler and more efficient to view and digest textual information when it's displayed in a scrollable list."

## Grouped rows: the two systems build the group inversely

- **Apple** — **one plate, many bare rows**, header outside the plate above it, separators inset. The section is the plate; its rounded corners belong to the section, not to the row.
- **Material** — **many plates with gaps between them**, with segmented first/last-rounded shapes marking the group's ends:

> "Gaps or dividers can separate lists into items and groups: Use gaps for contained lists… **Limit dividers to uncontained or complex lists, only when a stronger visual separation is necessary.**"

**Apple states no mechanical rule for what puts two rows in one group.** The full lists-and-tables text carries no criterion — no "same kind of setting", no "acts on the same object", no maximum group size. Grouping is left to the designer.

Material does state a scanning rule Apple does not: **"Place supporting visuals and primary text in the same position in each list item. Don't vary the position of elements within a list."** And "Avoid placing visuals in the center of a row because it makes the list difficult to scan."

## Grid versus feed — the two systems disagree, and the disagreement resolves the naming

**Material's feed explicitly allows unequal cells:** "A feed composition is flexible enough to allow for content with varying proportions and sizing"; "Use size and position to establish relationships among content elements"; "The order of items is determined by their position." Staggered and mosaic grids are named customisations.

**Apple's only grid spec is uniform** — a table of fixed unfocused widths at constant 40pt horizontal spacing (2 columns 860pt, 3 at 560, 4 at 410, 5 at 320, 6 at 260, 7 at 217, 8 at 184, 9 at 160) with the rule attached:

> **"Use consistent spacing. When content isn't consistently spaced, it no longer looks like a grid and it's harder for people to scan."**

Apple says nothing at all about grids of unequal cells.

**This resolves rather than contradicts.** Material gives the varying-size case a *different name* — **feed** — and reserves grid geometry for equivalence. So: **equal cells are a grid; unequal cells are a feed.** Two names, because they are two things.

## Canonical layouts, with the numbers

Material names exactly three: **feed, list-detail, supporting pane.**

**List-detail** — "for quickly accessing details of an item from a long list of content", for parent-child pairings.

| Breakpoint | Panes |
| --- | --- |
| Compact 0–599dp | 1 |
| Medium 600–839 | 1 recommended, or 2 |
| Expanded 840–1199 | 2 |
| Large 1200–1599 | 2 |
| Extra-large 1600+ | 2 |

**Supporting pane** — and the line that separates it from list-detail:

> "Use the supporting pane layout when the secondary content is only meaningful in relation to the primary content. **For content with a parent-child relationship, use a list-detail layout instead.**"

The primary "occupies the majority of the window (typically about two-thirds)". **The supporting pane does not shrink — it leaves the side and goes below:**

| Placement | Width | Breakpoint |
| --- | --- | --- |
| Below | flexible | compact or medium |
| Leading or trailing | **fixed 360dp** | expanded |

Google's Android mirror states ratios instead: 50/50 at medium, **70/30 at expanded**. Note these are two statements of the same pane and they agree only around 1200dp — M3's own page is the fixed-width one.

**Feed** — "uses a grid composition to enable quick content browsing and discovery… Feeds support displays of almost any size as grids can adapt from single to multi-column." Compact: "stack vertically, like a list of cards with individual items filling the width of the pane."

## Pane and depth caps, both stated

- **Material: "Don't use more than three panes."**
- **Apple: "In general, show no more than two levels of hierarchy in a sidebar."** With the escape hatch: "When a data hierarchy is deeper than two levels, consider using a split view interface that includes a content list between the sidebar items and detail view."

Apple's sidebar-versus-tab-bar trade: "When space is limited or you want to devote more of the screen to other information or functionality, a more compact control such as a tab bar may provide a better navigation experience."

Apple's collapse threshold is stated as an *environment*, not a number: "Prefer using a split view in a regular — not a compact — environment… In a compact environment, such as iPhone in portrait orientation, it's difficult to display multiple panes without wrapping or truncating the content."

**An explicit collapse order — which column goes first — is not stated anywhere in Apple's HIG text.** Hiding is framed as a user action: "Consider letting people hide a pane when it makes sense."

## The measure — the only number either system gives

Material, on lists:

> **"The ideal line length for text is typically between 40 to 60 characters, but large-screen devices can accommodate up to 120 characters per line. If a line of text is close to 120 characters in length, consider increasing the line height to improve readability."**

> "In fluid layouts, avoid excessively long lines of text when expanding containers and text-heavy components." Do: "Adjust margins to create a more comfortable line length for reading." **"Adapt the width of the list container based on a line's length, or by switching to a multi-column layout."**

**Apple gives no maximum content width and no line-length number** — searched across Layout and Typography. Its only centring statement is visionOS-specific: "prefer to keep content horizontally centered at very large sizes so people can easily view and interact with it."

### Material centres the seam, not the content

> "A split-pane layout uses two flexible panes and **visually centers the spacer** by default. The navigation and first pane are 50% of the window width to keep the spacer visually centered."

And at large sizes, "the spacer should be visually centered by default, even when using an expanded navigation rail. In split-pane layouts, navigation components shrink the leading pane, so the spacer remains centered."

**A layout invariant worth stealing: the seam stays on the window's midline, and navigation eats into the pane beside it rather than moving the seam.**

## Breakpoints

| Class | Width | Panes | Margins / spacer |
| --- | --- | --- | --- |
| Compact | < 600dp | one | 16dp |
| Medium | 600–839 | one recommended | 24dp / 24dp |
| Expanded | 840–1199 | one or two | 24dp / 24dp |
| Large | 1200–1599 | two; fixed pane **412dp** | 24dp / 24dp |
| Extra-large | ≥ 1600 | two; a side sheet may be a third | 24dp / 24dp |

Medium pane rule, verbatim: "Each pane in a two-pane layout should take up 50% of the window width. **Avoid setting custom widths.**"

**Apple's size classes carry no numbers at all** — compact or regular, horizontal and vertical. "Determine layout based on size classes, not device type or orientation", and **"Keep functionality the same as size classes change… Don't change your app's functionality based on the space it occupies."**

That is the sharpest contrast in the batch: Material adapts at five numbered widths; Apple adapts at two unnumbered ones and forbids the adaptation from altering what the app can do.

## Widgets — the section that governs what a tile may draw

### The widget does not own its plate

> **"Group your widget's background views and mark them as removable to ensure your widget appears correctly for each context and platform."**

And the system does strip it: on StandBy "the widget appears scaled up in size with the background removed"; "In the accented rendering mode, the system removes the background and replaces it with a tinted color effect"; "CarPlay and StandBy widgets both use the small system family widget with the background removed."

**The widget declares a background, the host may take it away, and everything inside must survive the stripping.** This is the same law this project holds — a background belongs to the group, not to the widget — stated by Apple from the other direction.

A background coloured *for meaning* is explicitly allowed: "the Stocks app uses a red background for falling stock values and a green background if a stock's value rises."

### Two margins, which is a two-step ladder

> "Use the standard margin width for widgets — **16 points** for most widgets… If you need to use tighter margins — for example, to create content groupings for graphics, buttons, or background shapes — setting margins of **11 points** can work well."

### Corners are computed, never typed

> "Coordinate the corner radius of your content with the corner radius of the widget. To ensure that your content looks good within a widget's rounded corners, use a SwiftUI container to apply the correct corner radius."

`ContainerRelativeShape` is "a shape whose dimensions the system calculates from an inset version of the current container shape" — concentric, computed.

### What is refused inside a widget

- **"Multiple interaction targets… might make sense for your content, but avoid creating app-like layouts in your widgets."**
- "Avoid expanding a smaller widget's content to simply fill a larger area" — "Small widgets use their limited space to typically show a single piece of information while larger sizes support additional layers of information and actions."
- "Avoid mirroring your widget's appearance within your app."
- Both density failures: "Sparse layouts can make the widget seem unnecessary, while overly dense layouts are less glanceable."
- Branding subordinate: "a small logo in the top-right corner is sufficient."
- Type: "display text using fonts at 11 points or larger"; **"Avoid rasterizing text"**; "Prefer using the system font, text styles, and SF Symbols."
- "When people interact with your widget in areas that aren't buttons or toggles, the interaction launches your app."

**An explicit ban on scrolling or video inside a widget is not in the current HIG page** — the full source text carries neither prohibition. The constraint is expressed as "avoid creating app-like layouts" plus glanceability. The older "widgets don't scroll" phrasing is not verified from a current source.

### Materials, since a plate is one

> **"Don't use Liquid Glass in the content layer."** … "Instead, use standard materials for elements in the content layer, such as app backgrounds."

Liquid Glass "forms a distinct functional layer for controls and navigation elements — like tab bars and sidebars — that floats above the content layer." The four standard materials are ultra-thin, thin, regular (default), thick.

And a selection rule this project already follows: **"Avoid selecting a material or effect based on the apparent color it imparts to your interface, because system settings can change its appearance and behavior."**

## What the sources refuse to give

Apple never states a mechanical rule for which rows belong in one grouped section, and never states a maximum content width or line length. Both are designer judgement in Apple's system, and specified numerically only in Material's.
