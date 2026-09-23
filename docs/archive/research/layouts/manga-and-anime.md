# Layouts on manga, anime and light-novel sites

Senkuro, MangaDex, AniList, MyAnimeList, Crunchyroll, Shikimori, Remanga, Royal Road. Every number below is a **computed value read off the live DOM in headless Chrome at 1440×900**, not inferred from a screenshot.

This batch answers a question none of the others could: **what is the thing that looks like a sidebar but does not touch the window edge.**

## It is a column, not a pane — and the difference is mechanical

| Site | Centred container | Measure | Inset column | Main | Page bg to its left |
| --- | --- | --- | --- | --- | --- |
| Senkuro | `max-width:1300`, pad 20 | 1260 | `aside` **280**, `flex:0 0 auto` | 960 | **90px** |
| AniList | `max-width:1140`, pad 50 | 1040 | grid track **208** | 792 | **200px** |
| MyAnimeList | fixed **1060** | 1038 | `.leftside` **225** | 801 | **190px** |
| Shikimori | `max-width:1200` | 1170 | `.c-image` **232** float | 894 | **120px** |
| Remanga | `max-width:1240` | 1240 | **242**, `position:sticky` | 942 | **100px** |
| Royal Road | Bootstrap `.container` **1170** | 1170 | `col-md-3` **292.5** | 585 + 292.5 | **127px** |
| MangaDex | grid with elastic gutters | — | grid area `art` **200** | 894 | 32 inside a pinned 256 nav |
| Crunchyroll | `max-width:1478`, pad 64 | 1350 | **none** — full-bleed hero | — | — |

**Every inset column is `position: static` and `overflow-y: visible`.** Remanga alone is `sticky`, and even it has no `overflow`. **None has its own scrollbar. None scrolls independently.** The page is one scroll surface.

### MangaDex proves the contrast inside a single page

`div.flex.flex-col.bg-accent.h-screen` sits at **x = 0, width 256, full height, flush to the window edge** — that is a **pane**. The cover column 32px further in, inside the content grid, is a **column**.

Same page, both things, and they behave differently: **the pane is chrome and survives every route; the column is content and dies when the grid reflows.**

> **A pane is addressed against the *window* and owns a scroll.**
> **A column is a track inside a *measure* and owns nothing.**

A column **cannot collapse into a drawer** — it has no window edge to slide from. What it does instead is **reflow and redistribute its contents**.

### MangaDex's grid is the mechanism worth stealing

```
grid-template-areas:
  "left  art       title     right"
  "left  art       buttons   right"
  "left  art       info      right"
  "left  art       stats     right"
  "left  synopsis  synopsis  right"
  "left  content   content   right"
```

| viewport | computed `grid-template-columns` |
| --- | --- |
| 1280 | `0px 200px 734px 0px` |
| 1440 | `0px 200px 894px 0px` |
| 1920 | `95px 200px 1184px 95px` |

**`left` and `right` are named zero-width gutter tracks that open only once the main track hits its cap.** One declaration serves three arrangements — including `100px 242px` on a phone — with no second markup copy.

## Two forks the vocabulary has to name

- **Full-height column** — Senkuro, AniList, MyAnimeList, Shikimori, Remanga. The column stands beside the tab strip and all tab content. Senkuro's `aside` measures 1410px tall, exactly matching its main section.
- **Header-band column** — MangaDex. Cover beside title and actions only; **synopsis and chapter list return to full measure below.**

## What each column holds — the rule holds across all of them

> **The leading column carries what the record *is* and what *you* can do to it** — cover, primary action, the record's own immutable facts.
> **The main column carries what the record *says*** — title, tags, description, and the list of its parts.
> **A trailing column carries the crowd, not the record.**

Shikimori is the proof, because it has all three: `.c-info-left` holds the record's facts (Тип, Эпизоды, Статус, Жанры, Рейтинг); `aside.l-menu` at x=1064 holds the ratings histogram, "В списках у 142934 человек", clubs, favourites and the ad slot.

Two instructive breaks: **Remanga** keeps only cover and actions in the column and moves metadata to the main — the column becomes a pure *action plate*, which is exactly why it is the only sticky one. **Royal Road** puts the primary action on the *trailing* edge: cover left, title centre, buttons right.

## Narrowing — three behaviours, and one thing nobody does

**Nobody stacks the column above the main one as a block. Nobody.** That is the strongest single finding here.

1. **Split by priority** (Senkuro, breakpoint 992px). The column's three children separate and re-rank: poster to the top (**still 280px wide, `margin:auto` centred — it never stretches**), then title, then **actions under the title**, then description, stats, tabs — and **metadata sinks to the very bottom of the page** (y≈1663 of 2400).
2. **Become the row** (MangaDex, AniList). The cover shrinks — 200→100, 215→100 — and the title sits beside it. **The header band turns into a row card.**
3. **Flatten in place** (AniList's `.sidebar`). A 208×3386 vertical stack becomes a **700×78 horizontal band** of chips, at the same position in the flow.

**Four of these sites implement the reflow by rendering the block twice** — Remanga via Fresnel (`fresnel-greaterThanOrEqual-md`), Senkuro by hand (the inactive copy measures 0×0). That is because **the contents change *rank*, not just position, and that is not expressible as a single CSS reorder.**

## Why it is not pinned to the edge

- **The column is inside the measure, so it is part of the reading width.** Pinning would decouple it: at 1920 the main column grows and the cover stays at the far left, and the eye must cross the whole screen between the cover and the title. **MangaDex proves it is deliberate — it caps the main track at ~1184 and opens symmetric 95px gutters rather than letting the pair spread.**
- **It lets the split reflow rather than collapse.** A pinned pane has to go *somewhere* — a drawer, a sheet, off-screen. A column just stops being a column.
- **It does not compete with host chrome.** MangaDex already owns the window edge with its 256px nav.

## The name

No source names "a narrow column inside a centred container that scrolls with the page" as a layout pattern. The closest true names:

- **Every Layout's `Sidebar` primitive** is exactly this, and explicitly not a window pane. Its switch is **intrinsic** — `min-inline-size: 50%` on the non-sidebar wraps the pair when the main part would fall below half — not a viewport query. The book's own line: media queries "pertain to the *viewport* width, and have no bearing on the actual available space."
- **GitHub Primer already ships the distinction as an API:** "PageLayout.Pane sits only beside the content area — unlike PageLayout.Sidebar, which is a full-height sidebar."
- Material and Apple both define theirs as dividing the **app window** — so *supporting pane* and *split view* are the wrong names for this.

**Call it a Sidebar column, or by its contents a record rail. Calling it a pane makes the wrong behaviours available.**

## The row card — measured anatomies

**Senkuro `.card-new`** 415×116, three per row, gap 8:

```
[cover 80×114, ratio 0.70]  [body 333×114, flex column]
  type badge overlaid           title      14px/500  100% alpha
  on the cover                  chapter    12px       80%
                                timestamp  12px       60%
```

**Three opacity tiers do the hierarchy, not three font sizes.** That survives a theme swap; three greys would not.

**MangaDex `.hchaptercard`** 527×80, cover 56×80, two columns at 1440:

```
title                                 16px/700, clamp-1
[flag + chapter, clamp-1]        ←→   [comment count]
[group icon + scanlator]         ←→   [time]
```

> **The text stack is not a stack of values — it is a stack of *lines*, each with a leading part (identity) and an optional trailing part (a metric), set by `justify-between`.**

That is the most transferable structural fact in the batch.

## Why the image on the leading edge — three things, all measured

1. **The title's left edge is at a constant x down the whole list.** Senkuro: every title at offset 93. MangaDex: 64. Royal Road: 143. **Titles form a straight vertical rule to scan.** With the image above, titles sit at the top of variable-height blocks with nothing aligned.
2. **The image becomes a fixed-width leading gutter the text wraps inside.** Every row card gives the image a fixed width and the body `flex:grow / min-width:0` — **the body absorbs every width change, the image never resizes.** A tile has the opposite contract: elastic image, fixed text.
3. **Multi-line text without a tall card.** A 56×80 cover buys three 20px lines at zero extra height; the same text under a 56-wide thumbnail would need a 240px-tall tile.

## Row versus tile is picked by the COLUMN's width, not the window's

**Crunchyroll is the decisive case — one component, one class, two shapes:**

| viewport | grid | card | thumbnail |
| --- | --- | --- | --- |
| 1440 | `238.4px × 5` | 238×273 | 238×134 (16:9) **above** — TILE |
| 420 | `380px` single | 380×85 | 151×85 (16:9) **left** — ROW |

And these sites **tile row cards into columns** on desktop — Senkuro 3 × 415, MangaDex 2/3/4 × 527 — which no phone layout would ever produce.

> **Row and tile are two shapes of one card, and width picks between them — but "narrow" is the column's width, not the window's.** A 415px column inside a 1440px window produces a row card for exactly the reason a 420px phone does.

## Three arrangements over the same records

| Arrangement | Perceivable | Lost |
| --- | --- | --- |
| **Poster grid** | recognition, and *how many* — density is the message | any attribute; you must already know what you seek |
| **Row card** | one record's *story* — what it is, how far, when it moved — plus a column of aligned title edges to scan | comparison on any single value; ~4× the space per record |
| **Table** | *comparison* — one value per column, aligned, sortable | recognition; a 50×70 cover is an icon, not an image |

The same relation as gallery-to-table, with the row card sitting between them.

**The tell for dropping the image entirely:** within one title the cover is constant, so it vanishes. Senkuro's chapter rows are 916×44 with no image; Remanga's 644×61; Royal Road's chapter list is a real `<table>` with `Chapter Name | Release Date`.

**When the values are comparable scalars it is a table, not a card.** MyAnimeList's library: `Image | Anime Title | Score | Type | Progress | Started | Finished | Days | Tags`, with the cover reduced to a **50×70 first column**.

## The tab strip's width declares its scope

| Site | Strip box | Aligns with |
| --- | --- | --- |
| Senkuro | 960×36 | main column (x=390) |
| AniList | 795×55 | main column (x=445) |
| MyAnimeList | 801×20 | `.rightside` (x=438) |
| Remanga | 644×40 | main column (x=382) |
| MangaDex | in `content` | full measure |

**Every strip sits inside the main column and is exactly as wide as it.** Four of six are narrower than the container by precisely the inset column's width.

**The tab strip swaps the main column and leaves the inset column alone.** Two sites implement tabs as *routes* — the URL changes, the page re-renders, and the column re-renders identically. A stacked-sections page has no way to express "this part does not change."

Why tabs and not sections: the lists are unbounded and mutually exclusive in time. MangaDex's content area measures **5871px tall** — stacked, "Comments" would begin 5000px below the fold. And **counts belong on the tab**: `Главы (59)`, `Comments (278)` — the strip doubles as a summary of what the record has.

## Dark-first changes paint, never geometry

Senkuro `rgb(16,16,20)`, Remanga `rgb(19,20,22)`, Crunchyroll pure black and dark-only. MangaDex follows the OS; AniList, Shikimori, MyAnimeList and Royal Road are light-first.

Geometry measured at four widths on Senkuro and two on Crunchyroll: **every number is a box, not a paint.** Dark-first shows up in exactly one structural choice — Senkuro carrying hierarchy as alpha tiers on one foreground colour rather than as separate greys.

## Not verified

Novel Updates (Cloudflare interstitial). MyAnimeList at narrow widths (fixed 1060px wrapper, `initial-scale=1` with no `width=device-width` — delivered zoomed-out, not reflowed). Senkuro's reader. Every library page behind a login.
