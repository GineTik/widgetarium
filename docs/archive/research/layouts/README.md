# Layouts, by the question each one answers

Twelve packets, 52 products, gathered September 2026. Each packet is a file beside this one. This page is the conclusion: the principle, the levels, the unified layouts with one priority purpose each, and the dependency graph.

## The principle

**A layout exists because it makes information perceivable in a way another arrangement would not.** Not because of a domain, not because of a data shape. Finder proves it in one window: the same folder, four views, and each makes a different channel available to the eye — what does it look like (icon), how does it compare (list), where is it (column), what is inside it (gallery). Nothing else differs.

Everything below is sorted by that, and every layout carries **one priority purpose** plus the others it also serves.

## The four levels, and the one this research added

Previously this project counted three. The manga sites forced a fourth, and the distinction is mechanical rather than a matter of taste.

> **A pane is addressed against the *window* and owns a scroll.**
> **A column is a track inside a *measure* and owns nothing.**

Measured on every manga title page: the inset column is `position: static`, `overflow-y: visible`, no scrollbar. MangaDex has both in one page — a 256px `h-screen` nav flush at x=0 (a pane) and a cover column 32px further in (a column). **The pane is chrome and survives every route; the column is content and dies when the grid reflows.**

**A column cannot collapse into a drawer. It has no window edge to slide from.** What it does instead is reflow and redistribute its contents.

| Level | Divides | Separated by | Owns a scroll |
| --- | --- | --- | --- |
| **1 · panes** | the window | a gutter | yes |
| **2 · columns** | the measure | a gutter inside the measure | no |
| **3 · bands** | a column | a step and a heading | no |
| **4 · peers** | a band | a plate | no |

GitHub already ships the level-1/level-2 distinction as an API: "PageLayout.Pane sits only beside the content area — unlike PageLayout.Sidebar, which is a full-height sidebar."

## Level 1 — panes

### rail
**Priority: make a small fixed set of destinations hittable without reading.** Also: carry ambient state for content that is off screen.

Icon-only because its items are few enough to learn by shape; **it never scrolls, so its items keep stable positions and become muscle memory.** VS Code: the Activity Bar "gives you additional context-specific indicators, like the number of outgoing changes" — a badge reporting on a pane that is closed.

A rail and a list pane are **the same region at two widths**: Telegram's chat list collapses to "a column of profile pictures". **What is dropped is the label, not the avatar.**

### list pane
**Priority: keep the parent on screen while the child is worked on.** Also: absorb all the scrolling the rail refuses to do.

Three levels — rail, list, leaf — are justified only when the outer set is small and fixed and the inner is unbounded. Otherwise two. Fold them and you get one scrolling list of two kinds of row, where nothing has a stable position.

**Cap: Apple, "show no more than two levels of hierarchy in a sidebar", with the escape hatch of inserting a content list.**

### supporting pane
**Priority: consult a fact about the main pane without leaving it.** Also: hold the same record re-sorted by kind instead of by time.

**Three tests, all three required:**
1. *About* the main pane — its content changes when the main selection changes. Fail → it is a sibling.
2. *Consulted, not committed to* — fail → it is a modal.
3. *Must not disturb the main pane's flow* — an inline thread would insert a variable-height block into a bottom-anchored scroll. Fail → it can be inline.

Ratio: Material gives 30% at expanded, 50% at medium, and the pane is **fixed at 360dp — it does not shrink, it leaves the side and goes below.** Material's own line separating it from list-detail: "Use the supporting pane layout when the secondary content is only meaningful in relation to the primary content. For content with a parent-child relationship, use a list-detail layout instead."

### bottom pane
**Priority: hold content that is wide in x and cheap in y.**

Terminal output, problems, logs. **A side pane truncates a line, destroying information; a bottom pane truncates history, which scrolling recovers.** VS Code's guidance both ways: put views there that "benefit from more horizontal space", and never one "that needs to be constantly visible, since users often minimize the Panel."

**If a layout language has a bottom pane, corner ownership is not optional.** Zed's `bottom_dock_layout` names all four answers; VS Code's Panel alignment is the identical knob; JetBrains states it as a preference.

### edge strip
**Priority: hold the one element whose position must never depend on state.**

A composer, a player, a status bar. Anything inside a scroll has a position that depends on how far you scrolled — finding it is a task. **Playback outlives navigation: a pane is replaced when you navigate into it; an edge strip is the only region no navigation can replace.**

### overlay
**Priority: act on anything, from anywhere.**

**Centring means *absence of attachment*, not emphasis.** Raycast's panel is positioned against the *screen*, never a window — it has no parent to be positioned relative to. Apple centres the alert on every platform for the same reason. **A centred thing inside a populated layout is claiming a detachment it does not have.**

## Level 2 — the measure and its columns

### the measure
**Priority: cap a line of prose at a length the eye can return from.**

**The measure is a property of the content, not of the page.** Supabase declares it in three sizes; AWS attaches it to five content types; GitHub does it silently — only the repo overview carries `container-xl` (1280px); issues, PRs, diffs and code carry nothing.

Numbers: **Obsidian 700px** (verified from its shipped CSS). Claude `75ch`. Material: **40–60 characters ideal, 120 the ceiling** — the only figure either design system gives.

**The test: does widening the window help?** For a list, yes — more columns visible. For prose, no — it hurts past ~75 characters. **Cap and centre exactly the things where widening hurts; anchor everything else.**

Centring is the *consequence* of capping, not a separate decision: once the measure is shorter than the window, the leftover width is dead space, and the only symmetric — therefore invisible — place to put it is split on both sides. That is why the control is symmetric padding (Zed's `left_padding`/`right_padding`, capped at 0.4) rather than a max-width.

**And media may break the measure; text may not.** YouTube runs both regimes on one page: the player goes full width in theater mode while title, description and comments stay in the centred column.

### record rail — the layout this vocabulary was missing
**Priority: keep what the record *is*, and what you can do to it, standing beside everything it says.**

Measured on eight sites. A column of 200–292px inside a container of 1060–1300px, with **90–200px of page background to its left.**

> **The leading column carries what the record *is* and what *you* can do to it.**
> **The main column carries what the record *says*.**
> **A trailing column carries the crowd, not the record.**

Shikimori proves it by having all three: the record's facts on the left, the ratings histogram and "В списках у 142934 человек" on the right.

**Two forks:** a **full-height** rail stands beside the tab strip and all tab content (Senkuro, AniList, MyAnimeList, Shikimori, Remanga); a **header-band** rail sits beside title and actions only, and the description returns to full measure below (MangaDex).

**Why not pinned:** pinning decouples the rail from the main column's measure — at 1920 the main column grows and the cover stays at the far left, so the eye crosses the whole screen between them. MangaDex proves the intent by capping its main track and opening symmetric 95px gutters instead.

**Narrowing — three behaviours, and one thing nobody does. Nobody stacks the rail above the main column as a block.**
1. **Split by priority** — cover to the top (still 280px, centred, never stretched), actions under the title, metadata to the bottom of the page.
2. **Become the row** — the cover shrinks 200→100 and the title moves beside it; the header band turns into a row card.
3. **Flatten in place** — a 208×3386 vertical stack becomes a 700×78 horizontal band of chips.

Because the contents change **rank** and not just position, four of these sites render the block twice and hide one copy — it is not expressible as a CSS reorder.

**The name:** Every Layout's `Sidebar` primitive, whose switch is **intrinsic** (`min-inline-size: 50%`), not a viewport query — "media queries pertain to the *viewport* width, and have no bearing on the actual available space." **Calling it a pane makes the wrong behaviours available.**

## Level 3 — bands

### band stack
**Priority: let the eye skip a whole topic without reading it.** Also: carry an argument that narrows as it descends.

Netflix: ~40 rows, up to 75 items per row, ~3000 items inside a scannable vertical budget. Their stated reason: row diversity exists so a member can **skip** a row suited to a different mood and find one that fits. **A wrapping grid cannot do this — it has no label per band, and vertical distance stops meaning "next topic".**

Cloudflare's Security Events is the narrowing variant: volume → which feature acted → which attribute dominates → individual events, filtered by clicking values inside the bands so the investigation never leaves the page.

**Band order is information.** Steam runs personal → crowd → price → taxonomy; Valve states it where it controls the layout end to end: hand-picked first, automatic last.

### swap
**Priority: several peers that are read one at a time, where the ones not shown must keep their state.**

**The tab strip's width declares its scope.** Measured on every manga title page: the strip sits inside the main column and is exactly as wide as it, four of six narrower than the container by precisely the rail's width. **The strip swaps the main column and leaves the rail alone.**

Why tabs, not sections stacked: the lists are unbounded and mutually exclusive in time. MangaDex's content area is 5871px tall — stacked, "Comments" would start 5000px below the fold. **And counts belong on the tab** — `Главы (59)`, `Comments (278)` — the strip doubles as a summary of what the record has.

### heading and step
**Priority: name a group without spending a container.**

**A heading plus a spacing step is sufficient when all of these hold:** the groups are peers on one dimension; they are read in a **fixed order** and that order is itself information; the reader wants sequence, not comparison; group sizes are **uneven** (a plate around a one-item group reads as broken, a heading does not); and no group is a **drop target**.

**A plate appears exactly when one of those fails.**

> **A kanban column is a heading rotated 90°.** The same grouping; the rotation adds comparability and a drop edge — and those are precisely what the plate pays for. Buying neither, the heading is the correct form.

## Level 4 — peers

### the card — one shape, with optional parts

**Priority: group a description of one thing, so it reads as one thing.**

Material, verbatim: **"The card container is the only required element in a card. All other elements are optional."** And the three variants "each provide the same legibility and functionality, so the variant you use depends on style alone."

Anatomy, with what is required, from Apple Podcasts where it is stated outright:

```
media       optional (and it is NOT a picture — a chart, a video, a track, a map)
title       required
subtitle    optional
meta        usually present
actions     at least one, for an object page
body        optional
```

**Every part is bare. Only the card wears a plate.** Material, Apple and shadcn converge: one plate is normal, two is rare. A plated header inside a plated card is what N2 refuses.

**The hero is not a bigger cell — it is a different asset,** with its own slot and its own region. It never participates in a grid, which is precisely why it cannot read as a broken grid.

**What earns a plate**, answered by Notion: the callout is "boxed text for tips, warnings, disclaimers". **The plate marks a change of speaker, not importance** — the icon is the giveaway, because an aside needs a labelled kind.

Material's negative rule is this project's escape ladder, word for word: **"Don't force content into cards when spacing, headlines, or dividers would create a simpler visual hierarchy."**

### row card — media on the leading edge
**Priority: give a column of records one aligned left edge to scan, while each still tells its own story.**

Three things it buys, all measured:
1. **The title's left edge is at a constant x down the whole list** — Senkuro 93, MangaDex 64, Royal Road 143. With the image above, titles sit at the top of variable-height blocks with nothing aligned.
2. **The image is a fixed-width leading gutter the text wraps inside.** The body takes `flex:grow / min-width:0` — **the body absorbs every width change, the image never resizes.** A tile has the opposite contract.
3. **Multi-line text without a tall card.** A 56×80 cover buys three lines at zero extra height.

**The text stack is a stack of *lines*, each with a leading part (identity) and an optional trailing part (a metric).** Not a stack of values.

> **Row and tile are two shapes of one card, and width picks between them — but "narrow" is the *column's* width, not the window's.**

Crunchyroll proves it: one component, one class, tile at 1440 (238×273, 16:9 above), row at 420 (380×85, 16:9 left). And these sites **tile row cards into columns** on desktop — 3 × 415, 2/3/4 × 527 — which no phone layout would produce. **It is not a phone pattern that leaked.**

**Drop the image when it stops disambiguating:** within one title the cover is constant, so chapter rows carry no image at all.

### grid
**Priority: scan peers of one size for the odd one out.**

**Equal cells are a grid. Unequal cells are a feed.** The two design systems appear to disagree and actually resolve: Material's *feed* explicitly allows "content with varying proportions and sizing"; Apple's only grid spec is a uniform column table with the rule **"When content isn't consistently spaced, it no longer looks like a grid and it's harder for people to scan."** Two names, because they are two things.

**Column count is fixed by width and every item moves on resize** — which is the test that separates a grid from a time axis (below).

Where unequal cells are wanted, the systems give declared spans and lose the responsive collapse: Grafana 24 columns, Datadog 12 with **high density doubling to 2 × 12 rather than widening to 24**. And Cloudscape forbids mixing: "Don't combine static and configurable layout in one dashboard."

**Floors by content kind, not by importance** (Datadog): timeseries ≥ 4 columns; log streams ≥ 6.

### table
**Priority: compare one value across every record on a shared axis with a shared baseline.**

Why Activity Monitor is a table and not cards: the question is never "tell me about this process", it is always rank-ordered on one numeric attribute. **Cards destroy exactly that — the same field lands at a different x in every card, and comparison degrades from a glance to *n* reads.** Apple: "the row-based format is especially well suited to making text easy to scan."

**Graphs are refused inside rows.** A per-row sparkline puts a second scale in every row and breaks the shared axis the table exists for.

### run
**Priority: make the gap itself carry the boundary.**

Consecutive items sharing an attribute form one run; constants are drawn **once at its head**; **spacing between runs exceeds spacing within.** Because within-run spacing is smaller, an ordinary gap now *means* "the speaker changed" — a boundary perceived without a line, a colour or a label.

Discord ships a setting called **"Message Group Spacing"**, which only makes sense if runs are objects. **The documented degrade is "drop the head, keep the run"** — never drop the grouping.

## The dependency graph

```
LEVEL 1 · panes — against the window, own a scroll
  rail ──────────┐
  list pane ─────┼──→ measure ──→ record rail ──┐
  supporting pane┘                              │
  bottom pane                    main column ───┤
  edge strip      (outside the tree)            │
  overlay         (outside the tree)            │
                                                ▼
LEVEL 3 · bands — inside a column               band stack
                                                swap  ──→ (swaps the main column only)
                                                heading + step
                                                     │
                                                     ▼
LEVEL 4 · peers — inside a band          card ── row card ── grid ── table ── run
```

**Reading the edges:**

- A **measure** exists inside a pane, never instead of one. A pane with no measure is full-bleed.
- A **record rail** exists only inside a measure. It is the one layout that cannot be expressed at level 1.
- A **swap** swaps the main column; the rail is outside the switch. Two sites implement tabs as routes and re-render the rail identically each time.
- **Edge strip and overlay hang off the window**, not off the tree. Neither can be a child of anything.
- **Cards live only inside a band**, never directly in a column — a lone card of its kind takes a heading and the step instead.

**Collapse order, consistent everywhere: supporting pane → list pane → main.** The main pane is the only region that is still itself at every width. Material states it as a resize rule; LM Studio drops its inspector to an ephemeral overlay first; chat apps turn panes into screens in that order.

**Caps:** Material, "Don't use more than three panes." Apple, two levels of sidebar hierarchy. This project, two plates deep.

## What this research removes from the catalogue

- **`board` (kanban) is not a layout.** "Items moving through a named lifecycle" is behaviour. The static fact is a row of equal columns of stacked cards — and that is `grid` plus a drop edge. The column is a heading rotated.
- **`dashboard-grid` is the wrong name.** It is `grid`, and the rule is equal cells. Dashboards are one place grids are used.
- **`header-body` and `media-body` are not two cards.** One card, optional parts.
- **`metric-tile` is not a layout.** One number is a card with a short body.

## What it adds

- **`measure`** — capped or full-bleed, decided by content kind.
- **`record rail`** — the inset column, level 2, with its three narrowing behaviours.
- **`row card`** — media on the leading edge, chosen by the column's width.
- **`feed`** — the unequal-cell sibling of `grid`, so `grid` can keep its rule.
- **`run`** — the level-4 grouping with a run key and a head.
- **`edge strip`** and **`overlay`** — the two that hang off the window.
