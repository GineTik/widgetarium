# Layouts in five media products

Netflix, Spotify, YouTube, Apple Music, Apple Podcasts. Netflix and Spotify publish engineering writing about their layouts, which makes this the batch with the most stated reasoning about *rows*.

## The shelf — why a scrolling row and not a wrapping grid

**The vertical axis becomes a list of themes to skip; the horizontal axis a rank inside one theme.**

Netflix's own paper describes the homepage as a matrix in which each row holds recommendations of a similar theme, labelled so the theme is transparent. Numbers from the same paper: roughly **40 rows per homepage, up to 75 videos per row** — about 3000 items held inside a scannable vertical budget.

The reason for the stack, in Netflix's words: diversity of rows exists so a member can **skip a row** that suits a different mood, occasion or household member and quickly find one that fits.

**A wrapping grid cannot do this.** It has no label per band, and vertical distance stops meaning "next theme".

### What the shelf deliberately hides

**The tail.** Netflix's GenPage post states that within each row the first few entities get the most attention and shape the row's perceived theme. So the row is engineered to be **judged by its head**, and the remaining ~70 items cost nothing vertically.

It also hides row length, any count or total, and cross-theme comparison — item 30 of row 1 can never sit beside item 1 of row 2.

Spotify's limit for third-party content sets is the shelf's honest admission of what it is: **never more than 20 items**, with a link at the end continuing into the app. **A shelf is a window onto a longer list, not the list.**

### Row order and item order, stated

Netflix serialises the page **in layout order: left to right, then top to bottom**, generating one row or entity at a time, each conditioned on what is already placed. Their help centre states the most recommended titles go to the top, and within a row the strongest start at the left.

Before 2015 a rule-based template fixed which *type* of row sat at each vertical position. The current algorithm uses no template — it may drop a row type entirely or give half a page to it.

And the cost is published: a Continue Watching row near the top can satisfy immediate intent yet **reduce how much of the page is browsed**. Row order trades satisfaction against exploration.

### When the shelf is refused

- When the set is the **object's own contents** rather than a recommendation theme — an album's tracks, a show's episodes. Those are vertical lists.
- When the members must be **compared to each other**.
- Spotify moved mobile Home away from pure shelves in 2023 to vertical preview feeds per content type: **when the goal is sampling one item at a time rather than comparing many, the shelf loses to a one-per-screen feed.**

## Equal cells: one shape per band, chosen by the band

**Where sizes differ, the product splits the band rather than mixing.** YouTube's 9:16 Shorts get their own shelf inside an otherwise 16:9 grid; the ratios are never interleaved.

Apple chooses the ratio **per surface, not per item**: album motion art is 3×4 on iPhone and 1×1 on iPad, Mac and TV.

**No published measurement exists for the readability cost of mixing sizes in one grid.** What the sources do support is that no product ships a mixed-size band.

### The hero is not a bigger cell — it is a different asset

Apple Podcasts lists distinct assets with distinct obligations: **Show Cover required**; Full Page Show Art optional; Episode Art optional; Chapter Art optional; Showcase Hero required only if the show is submitted for featuring.

**A hero has its own slot, its own source image and its own region. It never participates in a grid — which is precisely why it cannot read as a broken grid.**

### Overlay versus beside is decided by width, with a published rule

Apple requires the 3×4 iPhone album art to keep key elements inside a safe area clear of the notch, UI text, buttons and gradient. For the 1×1 on iPad, Mac and TV it states the **entire canvas is safe, because no UI elements sit over it**.

Same object, two drawings: **media-as-backdrop-with-overlay when narrow, media-as-standalone-cell when wide.**

## The media object page — the general card shape, with what is required

```
┌ header ────────────────────────────────┐   Level 1
│  [media]  title                        │   media  REQUIRED
│           subtitle / creator           │   title  REQUIRED
│           meta line (year, count)      │   meta   usually present
│           [actions row]                │   action REQUIRED (at least one)
│           description                  │   OPTIONAL, truncated
├ contents list ─────────────────────────┤   REQUIRED for a container object
│  row, row, row … vertical, ordered     │
├ related shelves ───────────────────────┤   OPTIONAL, 0..n
└────────────────────────────────────────┘
```

**Never optional: the media, the title, the contents list, at least one action.**
**Optional: backdrop or hero art, description, per-item art, related shelves, the meta line.**

Apple Podcasts gives the cleanest published statement of this: only the Show Cover is required to publish; everything else is enhancement.

Two details worth carrying:

- **The contents list is truncated by default.** Spotify's artist profile shows Popular capped at ten tracks, ranked automatically, refreshed every 24 hours, not manually editable.
- **The object page ends in shelves.** "Related" is a shelf appended under the object page — the page reuses the same primitive from the level above.

**When the shape is refused:** for an object with no contents list — a single track, a single video — the list slot is **replaced** by the related shelf. The shape does not survive with an empty list slot.

## The player strip — the only region no navigation can replace

Apple's own definition of the MiniPlayer is exactly the job: floating controls at the bottom edge showing what is currently playing, expanding into the Now Playing screen.

**What earns a place there:** the identity of the current item (art plus title), transport, and progress. **Nothing that belongs to a pane.**

**Why an edge rather than a pane: playback outlives navigation.** A pane is replaced when you navigate into it. An edge strip is the only region no navigation can replace — so it is the only place a fact spanning all panes can live.

All three products that document it make the strip **the collapsed form of a full-screen surface**, never a separate object. And it is absent when nothing is playing.

## Centring — YouTube runs two width regimes at once

The player size adapts automatically to the available browser width, and theater mode gives a full-width band without leaving the page.

So on one page: **the media is allowed to leave the centred column; the text below it — title, description, comments — stays in the centred measure.**

**The rule that generalises: media may break the max width; text may not.**

**Shelves go edge to edge by construction** — a band ending inside a gutter would suggest the row itself had ended. This is implicit in Spotify's rule that the full row is dedicated to its content with a "continue" link at the end, and in the clipped-at-viewport geometry of every product's shelf.

## Not verified

Apple's centring rules from the HIG (client-rendered, no text retrievable this run). Netflix's billboard geometry and current per-row cell sizes. Spotify's Now Playing bar wording from a Spotify source. YouTube's exact column widths. Any measured readability cost for mixed-size grid cells.
