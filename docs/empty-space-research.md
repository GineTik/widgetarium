# What to do with the empty space

`RESEARCH` · 2026-08-29

## TL;DR

The goal was wrong. Filling every cell is not achievable and not what makes a layout feel
right — a bento box has empty compartments and reads as designed. What the eye actually
punishes is an **irregular boundary**, and it punishes it harder than almost anything else:
vernier hyperacuity resolves misalignment finer than a single retinal cone. So the rule is not
*fill the space*, it is **flush the outer edge and never leave a hole with content to its
right**. Measured on the six stress boards: 354 layouts, interior holes went from present at
every narrow width to zero, without filling anything.

---

## 1. The two holes you found, and their single cause

Both were the same defect wearing different clothes.

```
metrics, odd column count          control strip, tall neighbour
┌──────────┬──────────┬───┐        ┌───┬───┬───┬───┬───┐
│ OPEN 128 │ OVERDUE  │▒▒▒│        │ + │ ⌕ │ ▽ │ ⇅ │ ⌗ │
├──────────┼──────────┼───┤        ├───┬───┼───┴───┴───┤
│ DONE  61 │ CYCLE    │▒▒▒│        │ ○ │ ! │           │
└──────────┴──────────┴───┘        ├───┴───┤  Panel 1  │
   two halves of a 5-column        │▒▒▒▒▒▒▒│           │
   board leave one column          │▒▒▒▒▒▒▒│           │
```

Left: `half` was `floor(columns / 2)`, so on an odd board every row stopped one column short.
Right: a five-row canvas was allowed to stand beside one-row buttons, and the void under the
buttons is unfillable by construction — **a height problem wearing a width problem's clothes**.

**Five rules removed both, and none of them fills anything.** The first three were enough for
the stack; the last two came out of the desktop path, where patching collisions failed twice
before the model itself was wrong.

1. **Flush the outer edge.** The last flexible tile in a row absorbs the remainder.
2. **One row, one height.** A tile joins a row only if the row's height is its height.
3. **A control is never stranded.** When a row breaks because the flexible tile will not fit,
   the buttons standing beside it come DOWN WITH IT — they are its buttons. Leaving them put
   the sidebar's menu button alone on a row of its own at four columns.
4. **Balance the rag.** Eight buttons on a seven-column board is not seven and a widow, it is
   four and four — typography's rule for a last line holding one word.
5. **A row is DISTRIBUTED, not scaled.** Scaling each tile alone and patching the collisions
   failed twice: two buttons collapsing at the same width landed on one cell, the floor dropped
   one to the row below, and a whole dashboard went out of line. The row is the unit — controls
   take a cell each, flexible tiles split the rest in the proportion they were authored, and
   the last absorbs the rounding.

---

## 2. What the competitors do

| product | mechanism | what it costs |
|---|---|---|
| **CSS Grid `grid-auto-flow: dense`** | backfills a hole with a **later, smaller** item | breaks reading order — MDN warns it is fine for a photo gallery and wrong when the HTML order means something, because tab order and screen readers still follow the document |
| **gridstack `compact` / `float:false`** | items fall upward into gaps | the board rearranges under the user |
| **Pinterest-style masonry** (Home Assistant's masonry view) | columns fill independently, items keep width and vary height | vertical order is scrambled across columns |
| **Apple WidgetKit** | fixed families on a regular page grid | empty space simply exists — and nobody minds, because the grid is regular |
| **Bento grids** (the dominant dashboard style of 2025–26) | deliberately uneven tiles, consistent gutters, **a flush outer rectangle** | nothing — this is the one that matches what we want |

The bento answer is the important one. Its stated principles are strict compartmentalisation,
hierarchy by tile size, and **unified spacing — "uneven gaps break the grid illusion"**. Note
what is *not* on that list: filling every cell. A bento box has empty compartments.

---

## 3. Other fields

### Typography — the widow, and the rag

Typesetting has had a name for our defect for five hundred years. A **widow** is a final line
holding a single word; the guidance is that a ragged edge should have "a consistent flow, with
lines that alternate from longer to shorter", and that widows "create isolated short lines that
appear ragged and unfinished".

Your screenshot of eight metrics ends with `THROUGHPUT` alone on the last row. That is a widow,
exactly. And typography's fix is not to fill the line — it is to **rebalance the measure so
the last line is not alone**, or to accept the rag when it is even.

**The transfer:** a lone tile on the last row is a defect; a short last row is not. Balance the
rag, do not fill it.

### Vision science — why the boundary matters more than the area

Vernier acuity is **hyperacuity**: the threshold for detecting a misalignment is *smaller than
the diameter of a foveal cone*, and it is cortical rather than optical. We are better at seeing
that two edges do not line up than at almost any other visual judgement.

**The transfer:** a notch in the board's silhouette is detected instantly; a large but
*rectangular* empty region is not. Spend the effort on the edge, not the area. This is why
flushing the last tile fixed the look while filling nothing.

### Botany — phyllotaxis, and the limit of packing

A sunflower places each seed 137.5° from the last — the golden angle — and simulations show
this "minimises gaps and overlaps better than any other method known". Nature's best possible
answer to filling a disc.

**The transfer is a warning, not a technique.** Even the optimal packing in nature does not
reach zero gaps; it reaches *evenly distributed* gaps with no seams or holes. Perfect fill is
not on the menu for anyone. Even distribution is.

### Operations research — bin packing

First-Fit-Decreasing — place the largest item first — is provably within 11/9 of optimal, and
it beats plain first-fit precisely because large items are the ones that leave unusable
remainders.

**The transfer, and why we decline it.** Sorting tiles by size would pack better and would
scramble the order a person authored. This is the same trade `grid-auto-flow: dense` makes and
the same one MDN warns about. **Reading order beats packing efficiency.** Where we do apply
it: the *height* rule is FFD in miniature — the tall tile takes its own row rather than
leaving a remainder nothing can use.

### Data visualisation — treemaps, and partitioning instead of packing

The squarified treemap (Bruls, Huizing & van Wijk) **subdivides** a rectangle instead of
placing items into it, so holes are impossible by construction — every point belongs to some
cell. It achieves average aspect ratios of 1.19–1.75 where naive slice-and-dice reaches 26–304.

**The transfer, deliberately declined.** Partitioning would end the empty-space problem
outright — but the paper also notes that "changes in the data set can cause dramatic
discontinuous changes in the layout". A board that re-partitions itself when one tile is added
is the rearranging board we have spent this whole design avoiding. Worth knowing that the
guaranteed-no-holes answer exists, and that its price is the one thing we refuse to pay.

### Masonry — the closer brick

A bricklayer finishing a course does not leave a gap and does not stretch a brick. They cut a
**closer** — a deliberately short brick — and the wall reads as intentional. The cut is
*visible*, and it is fine, because it is regular and it sits at the end.

**The transfer:** a short last row is allowed when it looks cut, not broken. That is precisely
the difference between a trailing rag and an interior hole.

---

## 4. Psychology — when does empty space read as a mistake?

Gestalt gives the mechanism, and it is not about quantity.

- **Figure–ground.** Whitespace is *ground*. It becomes a defect only when it turns ambiguous —
  when the eye cannot tell whether it is background or a missing thing.
- **Common region and proximity.** A gap *between* groups reads as intentional structure. The
  same gap *inside* a group reads as broken. Identical pixels, opposite meaning.
- **Closure.** The mind completes a shape from partial information — which is why a flush
  rectangle with an interior hole is worse than a smaller flush rectangle: the hole contradicts
  a shape the eye has already completed.
- **Comprehension.** Adequate whitespace measurably improves text comprehension and reduces eye
  strain; *inconsistent* spacing does the opposite. Consistency is the variable, not quantity.

**The operational test**, and it is cheap: *can the eye tell why this space is empty?* If the
emptiness sits at the end of a row, the answer is yes — it is the edge of the content. If it
sits with content to its right, the answer is no — and that is the only empty space we must
eliminate.

---

## 4b. Empty space INSIDE a widget — the mode we never had

The board's holes are fixed. The remaining voids in the screenshots are *inside* tiles: a
contents list with five links reserving six rows, prose with eight lines doing the same.

The objection was "we cannot know what is inside a widget, so how can we decide whether it
collapses?" **We do not decide. The widget reports.** Figma has shipped the vocabulary for
fifteen years — every frame is `Fixed`, `Hug contents` or `Fill container` — and Home Assistant
ships the same idea as data: a card answers `getCardSize()` in units of 50px and the masonry
view believes it.

| mode | height comes from | for |
|---|---|---|
| `fixed` | the authored `h` | anything the author sized on purpose |
| `hug` | the content, measured | lists, prose, forms — anything whose length varies |
| `fill` | the row it is in | a background, a canvas, a chart |

In the plugin this is **one `ResizeObserver`** on the widget's own content box. The widget
author writes nothing; the board learns the number and rounds it up to whole cells.

**Hug only ever shrinks, never grows past the authored height.** A widget that could demand
more room could push its neighbours off the board over content nobody sees — the state you get
when a list loads twenty items.

Measured on the reading board: contents + prose went from a 440px board to **153px**, with no
rule about what a contents list is.

### Two defects the first cut of hug had

**Hug was measured after the rows were laid out.** The contents list shrank from six rows to
two and the prose stayed where it had been put — so hugging *created* the void it was meant to
remove. Hug is now measured while the row is being built, before anything below it is given a
y. One ordering, not one more rule.

**A row of only buttons is now centred.** Eight tools with three empty cells hard against the
right edge reads as an unfinished row; the same emptiness split evenly reads as a toolbar.
This is the psychology section applied literally: symmetric emptiness is the kind the eye
accepts as deliberate.

### And one thing no algorithm can do

On a twelve-column board, eight one-cell buttons leave four columns over. **Nothing can fill
them, because there is nothing to put there** — the only other tile on that board is five rows
tall and cannot sit in a one-row gap. Centring makes the leftover symmetric; it does not make
it disappear, and no rule can.

The real answer there is compositional, not algorithmic: **eight tools in a row is one
`Toolbar`, not eight tiles.** The kit exists so an author reaches for the toolbar instead of
authoring eight widgets that happen to sit next to each other. A board cannot fix a
composition; it can only avoid making it worse.

## 4c. Who wins, the person or the algorithm

They are not competing, and that is the whole answer:

| the person owns | the algorithm owns |
|---|---|
| the ORDER tiles appear in | the exact x, y, w, h |
| which tile is big and which is small, relatively | wrapping, flushing, filling |
| which tiles hug | the column count, the cell size |

This is the split Figma auto-layout, CSS flexbox and Home Assistant sections all make: you
declare intent, the engine computes geometry. A person never types a coordinate and therefore
can never author a hole — which is what "auto-grouping" was reaching for.

## 4d. The even grid

The proposal: allow only even column counts, so a row can always be halved and nothing is ever
one column short.

**First, the honest arithmetic.** If both positions and widths must be even, the even grid is
*exactly* a grid of half as many, twice as wide columns. Nothing is expressible in one that is
not expressible in the other. Centring is not the argument either: a tile centres perfectly
whenever its width and the board's width share a parity, odd or even.

**What it does buy** is real: the odd leftover column disappears by construction rather than by
repair. That leftover is precisely where the dashboard's hole came from.

**What it costs**, measured across widths 900 → 320 on the demo:

| | cell size range | jumps as the window drags | biggest jump |
|---|---|---|---|
| odd allowed | 57–74px | 9 | 15px |
| even only | 48–74px | 5 | **26px** |

Half as many jumps, but each one nearly twice as big, and the cell gets 9px smaller at its
worst. A 26px lurch is visible.

**It has exactly one real use, and it is small.** With an odd leftover, a centred row cannot
split evenly: at 620px the button row sits 10px from the left and 78px from the right, because
one cell cannot be halved. On an even grid the same row measures 71px and 71px. That is the
only thing the parity buys that the flush rule does not already give.

**Recommendation: no, and keep the flush rule instead.** The flush rule already removes the
leftover column at every width, including odd ones — verified over 354 layouts with odd counts
in 168 of them. Paying a 26px lurch to fix something already fixed is a bad trade. The switch
is in the demo so the feel can be compared rather than argued.

## 5. What this changes

| was | is |
|---|---|
| fill every cell | flush the edge, forbid interior holes |
| empty space is failure | empty space at the end of a row is the rag, and it is finished |
| let widgets negotiate expansion in the manifest | not needed for this; the three rules did it with no manifest field |
| pack better | pack in reading order, and let the row's height decide its members |

**Your manifest idea is not dead, it is deferred.** A `grow: "wide" | "tall" | "none"` hint is
the right tool for a *different* question — which tile should take the extra room when there is
genuinely a choice. It is not the tool for holes, because the holes were caused by three rules
being missing, not by the board not knowing what a widget wants. Add it when a case appears
that the three rules cannot answer; adding it now buys complexity you already said you dislike,
for a problem that is now measured at zero.

## 6. Verified

354 layouts across six boards, swept every 10px from 900 to 320:

- interior holes: **0** (present at every narrow width on two boards before)
- widows — a lone small tile on a row of its own: **0**
- overlaps: **0** · tiles overflowing the board: **0** · tiles lost: **0**
- the burger, the tabs and the filter stay on one row at **all 59** widths
- the tab bar and both buttons share one row at **all 41** desktop widths
- the kanban hides a column at **no** width

## Sources

- [Squarified Treemaps — Bruls, Huizing & van Wijk](https://vanwijk.win.tue.nl/stm.pdf)
- [MDN — auto-placement and `grid-auto-flow: dense`](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Auto-placement_in_grid_layout)
- [MDN — grid layout and accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Accessibility)
- [The clinical use of vernier acuity — hyperacuity below cone diameter](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8523788/)
- [Biophysical optimality of the golden angle in phyllotaxis](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4607949/)
- [Bento grid dashboard design — principles](https://www.orbix.studio/blogs/bento-grid-dashboard-design-aesthetics)
- [Rags, orphans and widows in typography](https://medium.com/@maryannpatrick/rags-orphans-and-widows-in-typography-3d978a1fcdc8)
- [Gestalt principles of perception](https://courses.lumenlearning.com/waymaker-psychology/chapter/gestalt-principles-of-perception/)
