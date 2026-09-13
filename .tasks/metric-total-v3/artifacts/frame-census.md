# Frame census — `widgets/@default/metric-total-v3` (prefix `mt3-`)

## TL;DR

Six artboards are **three distinct UIs**: one card on a responsive ladder (`Main 840 → Medium 460 →
Compact 266.67`), the same card in bars view and dark theme (`Bars`), and two dialogs (`AddRecord`,
`RecordList`). The ladder has **three breakpoints — 620, 400, 240** (§6/D1). Every disagreement between
the sticky notes, the artboards and the kit is settled in §6, and the consequences a Stage 3 reviewer
will measure are listed in §8 so none of them is read as an error. Three items remain open (§7); none
blocks Stage 1.

Sources read: the six `.dc.html` artboards, `docs/reference/metric-total-draft/canvas.json` (13
annotations, all quoted where load-bearing), `tools/v2-frame.mjs:7`, `tools/design-diff.mjs`,
`styles.css`, `src/kit.js`, `src/widget-root.js`, `widgets/@default/tokens.css`. Neither v1 nor v2 was
opened.

---

## 1. Classification

### The axes, from `tools/v2-frame.mjs:7`

| frame | theme | view | tile | window | opens | hovers |
|---|---|---|---|---|---|---|
| Main | light | curve | 840 x 480 | 900 x 560 | — | — |
| Bars | **dark** | **bars** | 840 x 480 | 900 x 560 | — | **peak** |
| Medium | light | curve | 460 x 300 | 540 x 380 | — | — |
| Compact | light | curve | 266.67 x 320 | 900 x 420 | — | — |
| AddRecord | light | curve | 840 x 480 | 660 x 700 | **add** | — |
| RecordList | **dark** | curve | 840 x 480 | 660 x 700 | **list** | — |

### Ladder A — the card, curve view, light theme

`Main (840) → Medium (460) → Compact (266.67)`, ordered by tile width.

Justification: Main, Medium and Compact agree on every axis except `tile` — all three are `theme
light`, `view curve`, no `opens`, no `hovers`. By the skill's rule they are one UI at three widths.
Their markup confirms it: the same `tile > surface > (chart, content > head, headline, plates, foot)`
tree, the same part names, the same curve/area/dots/ramps chart, differing only in numbers and in
which parts are present.

### Distinct UI 1 — the card in bars view, dark theme, peak hovered (`Bars`)

Differs from Main on three axes at once: `view` (bars, so nineteen `<rect>` bars replace the two
curve paths and the `under` gradient is replaced by `barSoft`/`barStrong`), `theme` (dark), and
`hovers` (a `.tip` element exists that no other frame draws). Not a ladder step — it is Main's width
with a different body. Measured separately, never interpolated.

Bars is **also** the only evidence of the dark theme for the card, so it carries two independent
specifications: the bars chart, and every dark-theme colour and shadow on the card.

### Distinct UI 2 — the add-a-record dialog (`AddRecord`)

`opens: "add"`. A kit Dialog over a scrim; none of the card's parts appear. Light theme.

### Distinct UI 3 — the all-records dialog (`RecordList`)

`opens: "list"`. A kit Dialog over a scrim, dark theme. Shares the dialog chrome with AddRecord
(identical `.dialog`, `.close`, `.head`, `.dialog-title`, `.dialog-desc` rules) and nothing else.
AddRecord and RecordList are **not** a ladder: they differ in `opens`, which is the axis.

### What Compact is, and why it fits

The Compact artboard is not a width specimen — `canvas.json` titles it "Three tones, narrow tile" and
it draws **three** tiles through `<sc-for>` (tones up / flat / down, titles "Total orders", "Daily
steps", "Spend") at 266.67px each, with a design-only `.caption` under each. The first tile (`up`,
"Total orders", 66.0%, 3.15K) is the one that continues the ladder; the other two exist to show the
three tones and are not separate frames.

Its own caption names the band it means to be:

> `Compact.dc.html:326` — `caption: "narrow: two plates, no toggle, no period — Add is an icon"`

which is, word for word, the narrow row of annotation `ladder`. Its tile is 266.67px wide and the
ladder's floor is **240** (§6/D1), so 266.67 sits inside the `240–400` band and the two plates it draws
are correct. The `300` in the annotation is superseded.

`.caption` is canvas commentary. **It is not ported.**

---

## 2. The written breakpoint specification

Lifted from `canvas.json`. Quoted in full, in the order the notes give.

### Annotation `ladder` — the whole spec

> "What goes, and in what order, as the tile narrows:
>
> 620px and up — four plates as a 2x2, the toggle, the period written out, Add with its label.
> 400 to 620 — two plates, the toggle stays, the period shortens to 30d.
> under 400 — two plates, no toggle, no period, Add is an icon.
> under 300 — no plates at all: the headline and the line behind it.
>
> The order is what each number is worth when there is no room: today never goes, because it is the
> only one that answers whether the press landed. peak is the series in one number. avg is already
> derivable from the headline and the period, so it goes first; low goes next."

**The `300` in that quote is superseded — the floor is 240** (§6/D1). The quote stands verbatim because
it is a quote; the table below and §6/D1 carry the numbers that hold.

### Annotation `compact-note` — the order, restated

> "As the tile narrows the grid drops to two plates — avg goes first, then low — and the Add button
> loses its label before the list button goes."

### Annotation `toggle-small` — why the toggle is the cheaper loss

> "The toggle goes before the period on purpose. Under 400px the chart is a sparkline — bars and a
> curve draw the same picture at that width, so the choice between them is decoration, not a control."

### The ladder as four bands

| band | plates | toggle | period | Add | list button |
|---|---|---|---|---|---|
| >= 620 | four, 2x2: today, peak, low, avg | present | written out, `Past 30 days` | pill, icon + label | present |
| 400–620 | two: today, peak | present | shortened, `30d` | pill, icon + label | present |
| 240–400 | two: today, peak | **gone** | **gone** | **icon only**, 34x34 | present |
| < 240 | **none** | gone | gone | icon only, 34x34 | present |

The `240` and the `< 240` row are §6/D1, not the annotation, which named 300 and said nothing about the
foot. §6/D1 is where a later stage reads the ladder.

Mapping to artboards: 840 -> the `>= 620` band, drawn by `Main` (four plates, toggle, `Past 30 days`,
`Add record` with its label — matches the row exactly). 460 -> the `400–620` band, drawn by `Medium`
(two plates, toggle present, period reads `30d`, Add keeps its label — matches exactly). 266.67 -> the
`240–400` band, drawn by `Compact`. The `< 240` band is drawn by no artboard; §6/D1 settles what it is.

Removal order, for the record: `avg` first, then `low`; `today` never goes; the Add label goes before
the list button.

### NOT SPECIFIED IN THE DESIGN — and how each one stands now

None of these is in an annotation, a caption or an artboard. Four are settled in §6; two are still open
and repeated in §7. A later stage invents neither kind.

1. **The width at which the list button goes — SETTLED: there is no such width.** `compact-note` says
   the Add label goes "before the list button goes", which asserts an order but names no number, and
   the ladder has exactly three breakpoints (§6/D1), none of which removes it. All three card artboards
   draw it. It is present at every width, the `< 240` band included. Do not author a breakpoint for it.
2. **What goes under the floor — SETTLED: only the plates** (§6/D1). The head, the headline, the chart
   and the foot all stand, so the widget keeps its way to add a record at every width. `ladder`'s "the
   headline and the line behind it" is not read as exhaustive.
3. **The ordering in `toggle-small` — SETTLED: rationale only.** The ladder has three breakpoints, so
   the toggle and the period both leave at 400 and no band sits between 400 and 620. The note says why
   the toggle is the cheaper loss; it is not a fourth number.
4. **The ladder's floor — SETTLED: 240** (§6/D1). The manifest's own sizing fields are a separate
   question and are **still open** — §7/O1.
5. **Height — STILL OPEN.** Every breakpoint in the spec is a width. Compact's tile is 320 tall against
   Main's 480, and the content is a `flex-column` with `margin-top: auto` on the foot, so it absorbs
   height on its own — but nothing says what happens when the tile is too short for headline + plates +
   foot. §7/O2.
6. **Number formatting beyond the examples given — INFERRED in §4**, and holding for all six drawn
   values. Behaviour above `999K` is still undrawn — §7/O3.

---

## 3. Per-frame inventory

The `data-part` handle list is the part list of the matching `pairs-v3/<Frame>.json`. Every part there
needs a handle in the implementation, or it reads as absent.

### Main — tile 840 x 480, window 900 x 560, light, curve

Drawn: the tile; the inner surface clipping everything; the chart inset 26% from the left, running to
all four edges of the surface (no bottom strip — annotation `plates`); over it the content column —
head (title + curve/bars Segmented on the left, trend reading + period trigger on the right), the
76px headline `3.15K`, a 2x2 grid of four 114px plates (today tinted by the tone, peak, low, avg), and
the foot pinned to the bottom with the accent `Add record` pill and the 38px glass list button.

Handles: `root`, `surface`, `chart`, `content`, `head`, `head-left`, `head-right`, `title`, `seg`,
`seg-thumb`, `seg-curve`, `seg-bars`, `trend`, `trend-arrow`, `period`, `period-caret`, `total`,
`plates`, `plate-today`, `plate-today-value`, `plate-today-label`, `plate-peak`, `plate-peak-value`,
`plate-peak-label`, `plate-low`, `plate-low-value`, `plate-low-label`, `plate-avg`, `plate-avg-value`,
`plate-avg-label`, `foot`, `add`, `add-icon`, `open-list`, `open-list-icon`.

### Bars — tile 840 x 480, window 900 x 560, dark, bars, peak hovered

As Main, with: nineteen bars instead of the curve and its area fill; the Segmented thumb at the bars
position (`left: 32px`, not `2px`); and a tooltip `.tip` floating over the chart at `left: 44%; top:
128px` carrying a value line and a date line.

Handles: Main's list, plus `tip`, `tip-value`, `tip-day`.

The harness reaches the tooltip by dispatching a `pointermove` on `[data-part='chart'] svg`
(`tools/v2-frame.mjs`), so `chart` must contain the `<svg>` and the pointer handler must sit where
that event can reach it.

### Medium — tile 460 x 300, window 540 x 380, light, curve

As Main with every number stepped down (§4) and two changes of substance: the plates grid is one row
of two (today, peak), and the period reads `30d`.

Handles: Main's list minus `plate-low*` and `plate-avg*`.

### Compact — tile 266.67 x 320, window 900 x 420, light, curve

The first of three demo tiles. No Segmented, no period trigger — the head is title + trend only. Two
plates. The Add button is a 34x34 accent circle with no label. The chart is inset only 8% and uses a
300 x 300 viewBox. The today plate's value takes its tone from an inline `style` rather than an
`is-tone` class.

Handles: `root`, `surface`, `chart`, `content`, `head`, `title`, `trend`, `trend-arrow`, `total`,
`plates`, `plate-today`, `plate-today-value`, `plate-today-label`, `plate-peak`, `plate-peak-value`,
`plate-peak-label`, `foot`, `add`, `add-icon`, `open-list`, `open-list-icon`.

Not ported: `.caption`, and the second and third tiles.

### AddRecord — window 660 x 700, light, `opens: "add"`

A 560px-wide dialog, centred on a scrim. A pinned 28px close button; a title/description head; then a
row holding a calendar on the left (flex, taking the remaining 290px) and a 224px side column on the
right — `Amount` label, an Add/Subtract Segmented, a 44px pill field with the value and the unit, a
`Note` label, and a flexible rounded text area. The foot is right-aligned Cancel + accent Add record.

Handles: `add-dialog`, `add-close`, `add-close-icon`, `add-head`, `add-title`, `add-desc`, `add-body`,
`calendar`, `cal-head`, `cal-month`, `cal-prev`, `cal-next`, `cal-grid`, `cal-weekday`, `cal-day`,
`cal-day-outside`, `cal-day-picked`, `add-side`, `label-amount`, `sign`, `sign-thumb`, `sign-add`,
`sign-subtract`, `amount`, `amount-unit`, `label-note`, `note`, `add-foot`, `cancel`, `confirm`.

The harness opens this frame by clicking `[data-part='add']`, so the card's Add button keeps that part
name while the dialog is closed.

### RecordList — window 660 x 700, dark, `opens: "list"`

The same 560px dialog. Head; then a rounded 14px group of 52px record rows, hairline-separated, each
row carrying a 92px date, an ellipsising note, a signed amount tinted up or down, and two 30px
edit/delete buttons; then an amber warning band counting the undated records; then a foot with a
count on the left and the accent Add record on the right.

Handles: `list-dialog`, `list-close`, `list-close-icon`, `list-head`, `list-title`, `list-desc`,
`records`, `record`, `record-date`, `record-note`, `record-amount`, `record-actions`, `record-edit`,
`record-delete`, `record-last`, `record-down`, `undated`, `undated-icon`, `list-foot`, `list-count`,
`list-add`, `list-add-icon`.

The harness opens this frame by clicking `[data-part='open-list']`.

`record-last` exists to pin one rule: `.row:last-child { box-shadow: none }` — the hairline belongs to
every row but the last. `record-down` exists to pin the negative tint; it resolves to the third row in
the artboard (`−9`).

---

## 4. Style facts, per frame

Read out of each artboard's `<helmet><style>`. Geometry confirmed by measuring the rendered artboards
in headless Chrome; measured boxes are given as `w x h` where they were verified.

### The stage, and the tokens the design composes

Every card artboard declares these on `.stage`:

```
--wg-kit-fill:   color-mix(in srgb, var(--ink) 5.5%, var(--ground))
--wg-kit-raise:  color-mix(in srgb, #ffffff 12%, var(--ground))
--wg-plate:      color-mix(in srgb, var(--ink) 4.5%, transparent)
--wg-plate-blur: blur(22px) saturate(150%)
--muted:         color-mix(in srgb, var(--ink) 55%, var(--ground))
```

**`--wg-plate` is the one line of that block that does not carry over: the plate is 6.5% of the ink, not
4.5%** (§6/D2). Everything else in it is the implementation's too.

Ground colours, from `Main.dc.html`'s own `GROUNDS` / `TONES` table:

| design name | light | dark | host token |
|---|---|---|---|
| `--ground` | `#ffffff` | `#1e1e1e` | `--background-primary` |
| `--board` | `#fcfcfc` | `#161616` | — (`--background-secondary` is `#f6f6f6`; the board is outside the tile and is not the widget's) |
| `--ink` | `#222222` | `#dadada` | `--text-normal` |
| `--accent` | `#6d4ee0` | `#8b6cef` | `--interactive-accent` |
| `--tone` up | `#1f8a4c` | `#4ec97f` | `--text-success` |
| `--tone` down | `#c0392b` | `#e06c5f` | `--text-error` |
| `--tone` flat | `#707070` | `#999999` | `--text-muted` |
| `dotInk` | `rgba(34,34,34,0.11)` | `rgba(218,218,218,0.13)` — **not implemented** | `--wg-metric-dot`, 11% in both themes (§6/D6) |

Every one of these already exists as a token: `styles.css:77,80` give `--wg-kit-fill` / `--wg-kit-raise`
with exactly the design's formulas over `--text-normal` / `--background-primary`, and
`widgets/@default/tokens.css` already carries `--wg-metric-plate-blur` (`blur(22px) saturate(150%)`),
`--wg-metric-dot` (11%, which is the decided value) and `--wg-metric-up/down/flat/tone`. **No hex
literal is needed for any colour on the card.**

`--wg-metric-plate` in that same file is **4.5% and is neither used nor edited**: the decided plate is
6.5% (§6/D2), and `widgets/@default/tokens.css` is shared with the widgets already shipped from that
scope, which must not change appearance. The v3 widget composes its own in its own `widget.css`:
`--mt3-plate: color-mix(in srgb, var(--text-normal) 6.5%, transparent)`.

`--muted` is **not** `--text-muted`: the design's 55% mix of ink over ground is `#898989` in light,
where `--text-muted` is `#707070`. It must be composed:
`color-mix(in srgb, var(--text-normal) 55%, var(--background-primary))`.

### The tile is the engine's, not the widget's

Annotation `frame`:

> "The tile is the plugin's own frame, not the reference's.
> 16px radius, 8px pad, --wg-kit-raise fill, the widget shadow.
> The inner surface takes 8px — outer minus pad, the concentric law."

The design's `.tile` is:

```
width/height per frame; border-radius: 16px; padding: 8px;
background: var(--wg-kit-raise);
box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink) 4%, transparent),
            0 6px 47px rgba(0,0,0,0.035),      /* light; dark: 0.28 */
            0 4px 8px rgba(0,0,0,0.005);       /* light; dark: 0.16 */
```

`.wg-widget-root` (`styles.css:708-780`) already paints all of it: `border-radius:
var(--wg-widget-radius)` = `--wg-widget-radius-s` = `1rem` = 16px; `padding:
var(--wg-widget-pad-surface)` = 8px; `background: var(--wg-surface-fill, var(--wg-kit-raise))`;
`box-shadow: var(--wg-widget-edge), var(--wg-widget-shadow)` where `--wg-widget-edge` is
`inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 4%, transparent)` and `--wg-widget-shadow` is
`0 6px 47px rgba(0,0,0,0.035), 0 4px 8px rgba(0,0,0,0.005)` — the light artboards' numbers, exactly.

**The widget must not repaint the tile.** `WidgetRoot` (`src/widget-root.js:32`) spreads rest props, so
`data-part="root"` sits on it; it also supplies `container-type: inline-size; container-name: widget`,
which is what makes `@container widget (...)` the only correct width mechanism. In the
`tools/v2-frame.mjs` harness nothing else provides that container — `src/engine/render.js` renders
straight into `div.wg-tile-body` — so **the ladder works only if the widget's own root is a
`WidgetRoot`.** A width `@media` would read the Chrome window and is a defect.

Dark is the exception, and it is not the widget's to solve: §6/D5.

### Card geometry, all three ladder steps plus Bars

| | Main / Bars | Medium | Compact |
|---|---|---|---|
| tile | 840 x 480 | 460 x 300 | 266.67 x 320 |
| surface (measured) | 824 x 464 | 444 x 284 | 250.7 x 304 |
| surface | `radius 8; overflow hidden; 100%/100%` | same | same |
| chart inset | `0 0 0 26%` (meas. 609.8 x 464) | `0 0 0 34%` (293 x 284) | `0 0 0 8%` (230.6 x 304) |
| content padding | `18px 20px 16px` | `15px 16px 13px` | `14px 14px 12px` |
| content gap | 14 | 11 | 12 |
| head gap | 16 | 10 | 8 |
| head-left gap | 12 | 9 | — (no head-left) |
| head-right gap / font | 14 / 14px | 9 / 13px | — (no head-right) |
| title | 15px / 600 / `-0.01em` | 13 / 600 / `-0.01em` | 13 / 600 / `-0.01em` |
| trend | gap 5, weight 600, `color: var(--tone)`, inherits 14px | gap 4, 600, inherits 13px | gap 4, **13px declared**, 600, tone via inline `style` |
| trend arrow svg | 15x15, `stroke-width 2.1` | 14x14, 2.1 | 14x14, 2.1 |
| period | `height 30; padding 0 6 0 12; gap 6; 14px/500; color var(--muted); radius 999; background none` | `height 26; padding 0 4 0 9; gap 3; 13px/500` | absent |
| period caret svg | 16x16, `stroke-width 1.7` | 15x15, 1.7 | — |
| headline | 76px / 500 / `line-height .92` / `-0.04em` / tabular | 54 / 500 / .92 / `-0.04em` | 46 / 500 / **.94** / `-0.04em` |
| plates | `grid; repeat(2, minmax(0,1fr)); gap 8; width 236` (meas. 236 x 236) | `gap 8; width 184` (184 x 88) | `gap 8; width 176` (176 x 84) |
| plate | `aspect-ratio 1; flex column; justify space-between; padding 14px 16px 13px; radius 22` (114 x 114) | `padding 11px 13px 10px; radius 19` (88 x 88) | `padding 11px 13px 10px; radius 18` (84 x 84) |
| plate fill | `background var(--wg-plate); backdrop-filter var(--wg-plate-blur)` (+ `-webkit-`) | same | same |
| plate value | 30px / 600 / `line-height 1` / `-0.03em` / tabular | 24 / 600 / 1 / `-0.025em` | 23 / 600 / 1 / `-0.025em` |
| plate label | 12px / 500 / `var(--muted)` | 11 / 500 | 11 / 500 |
| today tint | `.plate.is-tone .plate-value { color: var(--tone) }` | same | inline `style="color: <tone>"` on the value |
| foot | `margin-top auto; flex; align center; gap 8; pointer-events auto` | gap 6 | gap 6, **no `align-items`** |
| add button | `height 38; padding 0 20px 0 16px; gap 8; radius 999; background var(--accent); color #ffffff; 14px/600` (meas. 135.9 x 38) | `height 34; padding 0 16px 0 13px; gap 6; 13px/600` (121.1 x 34) | **`34 x 34`; centred; no padding, no gap, no text** |
| add icon svg | 17x17, `stroke-width 2` | 16x16, 2 | 16x16, 2 |
| list button | `38 x 38; radius 999; background var(--wg-plate) + blur; color var(--ink)` | `34 x 34` | `34 x 34` |
| list icon svg | 17x17, `stroke-width 1.8` | 16x16, 1.8 | 16x16, 1.8 |

`.content` is `position: relative; z-index: 1; flex column; height: 100%; pointer-events: none`, and
only `.foot` re-enables pointer events. The chart sits under it at `position: absolute` with no
z-index.

### The Segmented (curve / bars)

Annotation `toggle`:

> "The curve/bars toggle is the kit's Segmented at size s.
> Both glyphs are in the kit — src/kit.js, curve and bars — drawn from the same paths as here.
> The period is a popover trigger, not a select."

Verified: `src/kit.js:35-36` holds `curve: '<path d="M3.6 13.2l3.5-4.3 3 2.6 3.2-4.6 3.1 3"/>'` and
`bars: '<path d="M5 14.4V9.8M10 14.4V5.6M15 14.4v-2.9"/>'` — character for character the artboards'
paths.

| | Main / Bars | Medium |
|---|---|---|
| `.seg` | `inline-flex; padding 2; radius 999; background var(--wg-kit-fill)` (meas. 64 x 28) | same, (58 x 26) |
| `.seg button` | `width 30; height 24; radius 999; color var(--muted)`; selected `color var(--ink)` | `width 27; height 22` |
| `.seg-thumb` | `top 2; bottom 2; left 2; width 30; radius 999; background var(--wg-kit-raise)` | `left 2; width 27` |
| thumb shadow | `0 1px 2px rgba(0,0,0,0.09), 0 3px 8px rgba(0,0,0,0.05)` (dark: `0.3` / `0.22`) | light values |
| glyph svg | 16x16, `stroke-width 1.8` | 15x15, 1.8 |
| selected | curve (thumb `left: 2px`) | curve |

In Bars the thumb is at `left: 32px` — the bars position — and everything else is identical.

Kit geometry to override from outside (`styles.css:1293-1306`): `.wg-kit-seg.is-s` gives `padding: 2px`
(matches) and its button `height: 24px` (matches Main) but `padding: 0 8px` with no width, so a 16px
glyph yields a 32px button against the design's 30. `--wg-kit-shadow` on the thumb is
`0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.06)`, not the design's two layers. `Segmented`
does **not** spread rest props (`src/kit.js:506`), so its root and thumb can only be reached through
`className` — hence `.mt3-seg` in the pairs.

### The chart, curve frames

`<svg viewBox="0 0 560 440" preserveAspectRatio="none">`, `display: block; width: 100%; height: 100%`.
Compact instead uses `viewBox="0 0 300 300"`.

```
<pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
  <circle cx="1" cy="1" r="1" fill="<dotInk>"/>
</pattern>
<linearGradient id="wash"    x1="1" y1="0" x2="0" y2="0">  0 -> tone @0.13 ;  0.82 -> tone @0
<linearGradient id="dotRamp" x1="0" y1="0" x2="1" y2="0">  0 -> #fff  @0   ;  0.55 -> #fff  @1
<linearGradient id="inkRamp" x1="0" y1="0" x2="1" y2="0">  0 -> #fff  @0   ;  0.22 -> #fff @0.3 ; 0.52 -> #fff @1
<linearGradient id="under"   x1="0" y1="0" x2="0" y2="1">  0 -> tone @0.24 ;  1    -> tone @0.015
<mask id="dotFade"><rect width="560" height="440" fill="url(#dotRamp)"/></mask>
<mask id="inkFade"><rect width="560" height="440" fill="url(#inkRamp)"/></mask>
```

Paint order: a full-bleed `wash` rect; then the dots rect inside `mask="url(#dotFade)"`; then, inside
`mask="url(#inkFade)"`, the area path (`fill: url(#under)`) and the stroke path.

Stroke: `fill none; stroke var(--tone); stroke-linecap round; stroke-linejoin round;
vector-effect non-scaling-stroke`. Width **2.4** on Main/Bars, **2.2** on Medium and Compact.

Compact's ramps differ: `inkRamp` stops are `0 @0`, **0.24** `@0.3`, **0.56** `@1`; `under` starts at
**0.22** rather than 0.24; the masks' rects are 300 x 300.

The area path is the stroke path closed with `L<w> <h> L0 <h> Z`.

Annotation `ink`:

> "Both the dots and the curve fade out to the left rather than ending.
> Dots are 11% of the ink at r=1 on a 14px grid — the reference's own numbers.
> The stroke reaches full tone only past the middle of the chart."

Annotation `plates`, second half:

> "The reference's bottom strip is gone — the chart runs to the surface's own bottom edge."

The curve data in Main/Medium is the same 30-segment cubic over `0 380 … 560 185.1`; Compact draws
three short synthetic curves over its 300 x 300 box. **The widget generates the path from records**, so
only the viewBox, the inset, the ramps, the gradients, the pattern and the stroke widths are portable
facts; the literal `d` is not.

### The chart, bars frame

Replaces `under` with two vertical gradients:

```
<linearGradient id="barSoft"   x1="0" y1="0" x2="0" y2="1">  0 -> #4ec97f @0.46 ; 1 -> #4ec97f @0.1
<linearGradient id="barStrong" x1="0" y1="0" x2="0" y2="1">  0 -> #4ec97f @1    ; 1 -> #4ec97f @0.4
```

Nineteen `<rect>` inside `mask="url(#inkFade)"`: `width 19.5`, `rx 9.7`, x at `5, 34.5, 64, 93.4,
122.9, 152.4, 181.9, 211.3, 240.8, 270.3, 299.7, 329.2, 358.7, 388.2, 417.6, 447.1, 476.6, 506.1,
535.5` (pitch 29.5), each `y + height = 462` — 22 units past the 440 viewBox bottom, which is how the
bottom corners are cut off. The seventh bar (`x=181.9, y=70, height=392`, the peak) takes `barStrong`;
the other eighteen take `barSoft`.

Annotation `bars-note`:

> "Bars sit on the same scale as the curve and are clipped flat at the bottom, so the rounded top is
> the only corner that shows.
> The hovered bar takes full tone; the rest fade down and, to the left, out."

The bar tops match the curve's y values one for one (`380, 335.7, 321, 350.5, 149.7, 143.8, 70, 129,
143.8, 135, 129, 129, 185.1, 140.9, 179.2, 99.5, 120.2, 197, 185.1`) — "the same scale" is literal.

### The tooltip (Bars only)

```
.tip       { position absolute; left 44%; top 128px; padding 10px 15px; radius 16;
             background var(--wg-kit-raise); box-shadow 0 10px 30px rgba(0,0,0,0.34); z-index 2 }
.tip-value { 16px / 600 / -0.01em; white-space nowrap }
.tip-date  { 12px; color var(--muted); white-space nowrap }
```
Measured 111.9 x 53. It is a sibling of `.chart` and `.content` inside `.surface`, not a child of
either.

### Dialog chrome, shared by AddRecord and RecordList

```
.stage        { display flex; align-items center; justify-content center;
                background rgba(0,0,0,0.22)  /* AddRecord */  |  rgba(0,0,0,0.32)  /* RecordList */ }
.dialog       { flex column; gap 14; width 100%; padding 18; radius 16;
                background var(--wg-kit-raise);
                box-shadow inset 0 0 0 1px var(--wg-kit-card-edge),
                           0 24px 60px rgba(0,0,0,0.14)   /* dark: 0.45 */ }
.close        { absolute; top 10; right 10; 28 x 28; radius 999;
                background var(--wg-kit-fill); color var(--ink) }   icon 16x16, stroke 1.8
.head         { flex column; gap 4; padding-right 32 }
.dialog-title { margin 0; 15px / 600 / line-height 1.3 }
.dialog-desc  { margin 0; 13px / line-height 1.45; color var(--muted) }
```

**Two lines of that block are superseded.** The `0 24px 60px` cast shadow is dropped — a dialog is told
apart by its edge alone (§6/D3) — and the scrim is `0.22` in both windows (§6/D9). Everything else in it
holds.

Dialog tokens declared on the stage: `--wg-kit-card-edge: color-mix(in srgb, var(--ink) 9%,
transparent)`; `--muted` is **58%** here (not 55% as on the card); `--faint` is **36%** in AddRecord
and **38%** in RecordList.

Against the kit (`styles.css:605-660`): `.wg-dialog` is `gap 14; width min(560px,100%); padding 18;
border-radius var(--wg-widget-radius)` (=16); `background var(--wg-kit-raise)`; `.wg-dialog-head` is
`gap 4; padding-right 32`; `.wg-dialog-title` is `15px / 600 / 1.3`. Every one matches. The scrim
`--wg-overlay-scrim` is `rgba(0,0,0,0.22)` — AddRecord's number exactly. `--wg-kit-card-edge`
(`styles.css:82`) is the design's formula over `--text-normal`. The one disagreement is the cast shadow,
settled in §6/D3: there is none, and the implementation takes the kit's own edge at 12% rather than
composing the artboards' 9%.

Measured: AddRecord's dialog is 560 x 415.5, RecordList's 560 x 505.3.

### AddRecord body

```
.row       { flex; gap 10; align-items stretch }                       meas. 524 x 273.2
.cal       { flex column; padding 6px 8px 8px; radius 14;
             background var(--wg-kit-fill); flex 1 1 auto }            290 x 273.2
.cal-head  { flex; align center; space-between; padding 2px 4px 6px }  274 x 36
.cal-month { 13px / 600 }
.cal-step  { 28 x 28; radius 999; background none; color var(--ink) }  icon 16x16, stroke 1.8
.cal-grid  { grid; repeat(7, minmax(0,1fr)); gap 2 }                   274 x 223.2
.cal-weekday { grid; place-items center; height 26; 11px / 500; color var(--faint) }   37.4 x 26
.cal-day   { aspect-ratio 1; grid; place-items center; radius 999; background none;
             font-size 13; tabular-nums; color var(--muted) }          37.4 x 37.4
.cal-day.is-outside { color var(--faint) }
.cal-day.is-today   { color var(--ink); box-shadow inset 0 0 0 1px color-mix(in srgb, var(--ink) 26%, transparent) }
.cal-day.is-picked  { background var(--accent); color #ffffff; font-weight 600; box-shadow none }

.side      { flex column; gap 10; width 224 }                          224 x 273.2
.label     { 11px / 600 / letter-spacing 0.01em; color var(--muted); padding-left 4 }   224 x 13
.sign      { inline-flex; padding 2; radius 999; background var(--wg-kit-fill) }        224 x 34
.sign button { flex 1; height 30; radius 999; 14px / 500; color var(--muted) }          110 x 30
.sign button[aria-selected=true] { color var(--ink); font-weight 600 }
.sign-thumb  { top 2; bottom 2; left 2; width calc(50% - 2px); radius 999;
               background var(--wg-kit-raise);
               box-shadow 0 1px 2px rgba(0,0,0,0.09), 0 3px 8px rgba(0,0,0,0.05) }      110 x 30
.field     { flex; align center; gap 8; height 44; padding 0 16; radius 999;
             background var(--wg-kit-fill) }                           224 x 44
.field.is-area { flex 1 1 auto; height auto; align-items flex-start;
                 padding 13px 18px; radius 22 }                        224 x 129.2
.field-value { 22px / 600 / -0.02em; tabular-nums }
.field-unit  { margin-left auto; 13px; color var(--faint) }            39 x 16
.field-text  { 14px; color var(--faint) }
.foot      { flex; align center; justify-content flex-end; gap 8 }     524 x 36
.btn       { inline-flex; align center; gap 8; height 36; padding 0 18; radius 999;
             background var(--wg-kit-fill); color var(--ink); 14px / 600 }   cancel 82.3 x 36
.btn.is-accent { background var(--accent); color #ffffff }             confirm 110.9 x 36
```

The calendar draws **35 cells, five rows**, with one leading outside day (`AddRecord.dc.html:382-385`:
`LEADING = 1; LENGTH = 30; PICKED = 12; CELLS = 35`). No cell carries `is-today` in the artboard, so
that rule is declared and unused there. **The kit's 42 cells win** (§6/D4), and the picked day is today
rather than the 12th (§6/D7) — so on open `is-today` and `is-picked` land on the same cell, which the
artboard never shows.

Annotation `dialog-note`:

> "Both windows are the kit's Dialog: 16px corner, the raise fill, the hairline edge, no cast shadow.
> The calendar's cells are square, so a picked day is a circle and the month fills the window's
> height instead of leaving a band under it."

### RecordList body

```
.list      { flex column; radius 14; background var(--wg-kit-fill); overflow hidden }   524 x 312
.row       { flex; align center; gap 12; height 52; padding 0 8px 0 14px;
             box-shadow inset 0 -1px 0 var(--hairline) }               524 x 52
.row:last-child { box-shadow none }
.row-date  { width 92; 13px / 500; tabular-nums }                      92 x 16
.row-note  { flex 1 1 auto; min-width 0; 13px; color var(--muted);
             overflow hidden; text-overflow ellipsis; white-space nowrap }   291 x 16
.row-amount { 15px / 600 / -0.01em; tabular-nums }                     19 x 18
.row-amount.is-up   { color var(--up) }     /* #4ec97f = --text-success */
.row-amount.is-down { color var(--down) }   /* #e06c5f = --text-error  */
.row-actions { flex; gap 4 }                                           64 x 30
.row-btn   { 30 x 30; radius 999; background var(--wg-kit-raise);
             box-shadow inset 0 0 0 1px var(--wg-kit-card-edge); color var(--ink) }
             icons 15x15, stroke 1.6
.warning   { flex; align center; gap 10; padding 10px 14px; radius 14;
             background color-mix(in srgb, var(--warn) 16%, var(--ground));
             color var(--warn); 13px / 500 }                           524 x 37   icon 17x17, stroke 1.7
.foot      { flex; align center; gap 8 }                               524 x 36
.foot-count { margin-right auto; 12px; color var(--faint) }            112.2 x 15
.btn       { inline-flex; align center; gap 8; height 36; padding 0 18px 0 14px; radius 999;
             background var(--accent); color #ffffff; 14px / 600 }      131.9 x 36   icon 17x17, stroke 2
```

`--hairline: color-mix(in srgb, var(--ink) 10%, transparent)`; `--warn: #d9822b`.

Both have tokens: `styles.css:84` is `--wg-kit-warning: var(--color-orange, #d9822b)` — the design
used the token's own fallback — and `styles.css:86` is `--wg-kit-warning-wash: color-mix(in srgb,
var(--wg-kit-warning) 16%, var(--background-primary))`, which is the warning band's background
formula exactly. `--hairline` has no token and must be composed from `--text-normal`.

### Literal text, and every format in the design

| where | literal | the rule |
|---|---|---|
| title | `Total orders` | the `title` gateway, verbatim |
| headline | `3.15K`, `128K`, `1.02K` | see below |
| trend | `66.0%`, `12.4%`, `0.3%` | one decimal, always; no sign — the arrow carries direction |
| today plate | `+4`, `+1`, `−9` | explicit sign; the minus is **U+2212 MINUS SIGN**, not a hyphen |
| plate labels | `today`, `peak`, `low`, `avg` | lower case, no unit |
| period, wide | `Past 30 days` | the period row's `label`, verbatim |
| period, 400–620 | `30d` | `<days>d` |
| add button | `Add record` | |
| list button | `aria-label="All records"` | |
| tooltip | `205 orders` / `05 Sep, 2026` | `<amount> <unit>` / `DD Mon, YYYY`, day zero-padded |
| add dialog | `Add a record` / `One note lands in Metrics, named after the day and the minute.` | |
| add dialog | `Amount`, `Add`, `Subtract`, `orders`, `Note`, `Optional`, `Cancel`, `Add record` | |
| calendar | `September 2026`; weekdays `M T W T F S S` | `Month YYYY`; week starts Monday |
| list dialog | `All records` / `Newest first. Editing one redraws the card behind this window.` | |
| record rows | `12 Sep`, `11 Sep`, `08 Sep`, `05 Sep`, `02 Sep` | `DD Mon`, day zero-padded |
| empty note | `—` | U+2014 EM DASH |
| row amount | `+4`, `+166`, `−9`, `+162` | explicit sign, U+2212 for negatives |
| warning | `2 records carry no date and stand outside every number on the card` | both forms in §6/D8 |
| count | `19 records · Metrics` | both forms in §6/D8; U+00B7 MIDDLE DOT |

**Every `aria-label` in the design, complete.** Grepped from the six artboards — seventeen in all, and
no other element carries one, so nothing here needs authoring: `Curve` and `Bars` (the Segmented's two
buttons, on all three card widths); `All records` (the card's list button, all three widths);
`Add record` (Compact's icon Add — the wide Add carries the same words as visible text instead);
`Close`, `Previous month`, `Next month` (AddRecord); `Close`, `Edit`, `Delete` (RecordList).

**The headline rule, inferred.** Six examples: `3150 -> 3.15K`, `128000 -> 128K`, `1020 -> 1.02K`,
`9400 -> 9.4K`, `205 -> 205`, `184 -> 184`. Consistent with: three significant figures, trailing
zeros after the decimal point trimmed, `K` above 1000. **Inferred, not stated** — no annotation gives
it. Behaviour above `999K` is not shown at all.

**The flat threshold.** `Compact.dc.html:337` — `caption: "under half a percent reads as neutral"` —
with that card's `percent: "0.3%"` and `tone: "#707070"` (= `--text-muted`). So `|change| < 0.5%`
renders the flat tone and the flat arrow.

**Arrow paths**, from `Main.dc.html:450-454`, all on the 20-grid at `stroke-width 2.1`:

```
up:   M10 15.4V5.5M5.7 9.8L10 5.5l4.3 4.3
down: M10 4.6v9.9M5.7 10.2L10 14.5l4.3-4.3
flat: M4.6 10h10.8M10.9 5.7L15.2 10l-4.3 4.3
```

Other glyph paths: caret `M6.4 8.6l3.6 3.4 3.6-3.4` (1.7); plus `M10 4.9v10.2M4.9 10h10.2` (2);
list `M7.4 6.2h8M7.4 10h8M7.4 13.8h8` plus three `r=0.9` filled circles at `cx=4.4` (1.8); close
`M6.4 6.4l7.2 7.2M13.6 6.4l-7.2 7.2` (1.8); month back `M11.75 5.5l-4.5 4.5 4.5 4.5` and forward
`M8.25 5.5l4.5 4.5-4.5 4.5` (1.8); edit `M4.6 15.4l1-3.7 7.4-7.4 2.7 2.7-7.4 7.4z` (1.6); delete
`M4.8 6.4h10.4M8.2 6.4V4.9h3.6v1.5M6.4 6.4l0.7 8.4h5.8l0.7-8.4` (1.6); warning
`M10 3.6L17 16H3z` + `M10 8.4v3.2M10 13.6v0.4` (1.7). All `viewBox="0 0 20 20"`, `fill none`,
`stroke currentColor`, `stroke-linecap round`.

**The harness's data is not the design's data.** `tools/v2-frame.mjs` feeds 60 dated records plus 2
undated ones; its 30-day window totals 5096, its peak is 205 on 31 Aug 2026, its low is 100, and its
newest note is empty. So the screen will read `5.1K`, `31 Aug, 2026` and `62 records · Metrics`, not
the artboards' numbers. **Only the formats above are the contract; the values are not.**

---

## 5. Pairing coverage

| frame | `pairs/` (v2) | `pairs-v3/` (written now) | parts |
|---|---|---|---|
| Main | yes | yes | 35 |
| Bars | yes | yes | 38 |
| Medium | yes | yes | 29 |
| Compact | yes | yes | 21 |
| AddRecord | yes | yes | 30 |
| RecordList | **yes** | yes | 22 |

Correction to the brief this stage was given: `docs/reference/metric-total-draft/pairs/RecordList.json`
**does** exist (written 13 Sep 11:39). All six v2 pairings exist. The six new files are
`docs/reference/metric-total-draft/pairs-v3/<Frame>.json`; nothing under `pairs/` was touched.

`size` convention, checked against the frames table: `pairs/Main.json` carries `[900, 560]`, which is
`FRAMES.Main.window`, not the tile. It holds for every file — AddRecord and RecordList carry
`[660, 700]` where their stages are 510 and 620 tall. **`size` is the frame's window.** The v3 files
follow it.

Every `design` selector was rendered through `artboardFor` + headless Chrome and counted: 175
selectors across the six artboards, **every one matching exactly one element**, each with a non-zero
box. The measured boxes are the ones quoted in §4.

Then re-measured through `design-diff.mjs`'s own `measuredSide`, reading each `pairs-v3` file the way
`design-diff --pairs` will: 175 parts, **0 absent on the design side**.

Falsified, as the protocol requires for an introduced pairing: `pairs-v3/Main.json`'s `total` selector
was changed from `.headline` to `.headline-broken-on-purpose` (one occurrence asserted before the
edit), the check went red — `Main 35 parts, 1 absent: total`, exit 1 — and the file was restored with
the reverse targeted edit. `md5` before and after: `c262f864cbb9103a9f505f4a207e107b` both times.

### Where `impl` is a class rather than a `data-part`, and why

`data-part` is used for every part the widget itself draws. These cannot carry one, because the kit
component that renders the box does not spread rest props onto it, and the kit is never edited:

| part(s) | `impl` | why |
|---|---|---|
| `seg`, `seg-thumb`, `seg-curve`, `seg-bars` | `.mt3-seg`, `.mt3-seg .wg-kit-seg-thumb`, `.mt3-seg button:nth-of-type(n)` | `Segmented({items, value, onChange, size, className})` (`src/kit.js:506`) takes no rest; the thumb and the buttons are its own children |
| `sign`, `sign-thumb`, `sign-add`, `sign-subtract` | `.mt3-sign`, `.mt3-sign .wg-kit-seg-thumb`, `.mt3-sign button:nth-of-type(n)` | same component |
| `calendar`, `cal-*` | `.mt3-calendar`, `.mt3-calendar .wg-kit-cal-*` | `Calendar({month, onMonthChange, selected, today, onSelect, renderDay, className})` (`src/kit.js:1049`) takes no rest |
| `add-dialog`, `list-dialog` | `.mt3-add-dialog`, `.mt3-list-dialog` | `DialogContent({className, width, children})` (`src/dialog.js:262`) takes no rest |
| `amount`, `note` | `.mt3-amount`, `.mt3-note` | `Field({icon, value, onInput, placeholder, type, ...rest})` (`src/kit.js:445`) routes rest to the **input**, so a `data-part` lands inside the box, not on it |

A `data-part` on an `<svg>` is fine, so every icon part uses one.

### Parts deliberately not paired

- **`.caption`** (Compact) and Compact's second and third tiles — canvas commentary and a tone demo,
  not widget structure.
- **`.field-value`** and **`.field-text`** (AddRecord) — the design draws the amount and the note
  placeholder as spans whose inline box is the width of their text; the widget needs an `<input>` and
  a `<textarea>`, whose boxes fill the field. Pairing them would report a width error that is not a
  geometry defect. Their typography is pinned in §4 instead and must be checked by reading at 3C:
  value `22px / 600 / -0.02em / tabular-nums`, placeholder `14px / var(--faint)`.
- **`seg-thumb` in Compact and `period*` in Compact** — those parts do not exist at that width.

### Parts whose height cannot agree by construction

Both are paired because everything else about them is measurable and correct. A **height-only** error
on them at 3A is a recorded consequence, not a worklist item:

- **`list-dialog`** — design 560 x 505.3 (six rows); the kit caps `.wg-dialog` at `max-height: 70vh`,
  which is 490px in the 660 x 700 window, and the harness feeds 62 records. A consequence of the
  harness's data, not of a decision — see the closing note of §8.
- **`records`** — design 524 x 312 (six rows at 52); the implementation draws 62. Same cause.
- **`calendar`, `cal-grid`, `add-dialog`** — certain, now that D4 has resolved in the kit's favour
  (42 cells, six rows, §6/D4): square cells at 37.4px make the grid 223.2 -> 262.6 and the dialog
  415.5 -> 455. Authorised divergence §8.5.

---

## 6. Decisions (settled by the owner)

**The tiebreak rule, which governs every entry below and the whole of §4: where a sticky note and an
artboard disagree on a number, the annotation is the truth and the artboard is stale.** Four of the ten
decisions are nothing but that rule applied (D2, D3, D6, D9). A later stage that meets a fresh
disagreement resolves it the same way instead of asking again.

### D1 (was B1) — the ladder's floor is 240, and both readings are kept

Both readings the census offered are accepted: the Compact artboard **is** the narrow-band specimen,
**and** 266.67 is its real width. The floor moves from 300 to **240**, which makes the two consistent.

The ladder therefore has **three breakpoints: 620, 400, 240.** This table is the single place a later
stage reads them from.

| band | plates | toggle | period | Add | list button | chart |
|---|---|---|---|---|---|---|
| `>= 620` | four, 2x2: today, peak, low, avg | present | written out, `Past 30 days` | pill, icon + label | present | full |
| `400–620` | two: today, peak | present | shortened, `30d` | pill, icon + label | present | full |
| `240–400` | two: today, peak | gone | gone | icon only, 34 x 34 | present | full |
| `< 240` | **none** | gone | gone | icon only, 34 x 34 | present | full |

The bands are widths of the **tile**, so they are read as `@container widget (min-width: ...)` and
nothing else — a width `@media` reads the Chrome window and is a defect (§4). `WidgetRoot` is what names
that container, so the widget's own root must be a `WidgetRoot` for the ladder to work at all.

**Below 240 only the plates go.** The head (title + trend), the headline, the chart and the foot with
both buttons all stand. `ladder`'s "the headline and the line behind it" is not read as exhaustive: a
width at which the widget cannot add a record is a worse answer than a cramped one, and the owner's
wording named only the plates.

`Compact` at 266.67 sits inside `240–400` and draws two plates, no toggle, no period and an icon Add —
exactly what that band says, so nothing about that frame is a divergence. **No artboard draws the
`< 240` band**: it is implemented from this table and measured by nothing at Stage 3. That is accepted.

### D2 (was B2) — the plate is 6.5% of the ink

Annotation `glass` wins over the four artboards and over the shipped token. The plate fill is
`color-mix(in srgb, var(--text-normal) 6.5%, transparent)` under `blur(22px) saturate(150%)`, no white
and no rim.

`widgets/@default/tokens.css` is **not edited** — its `--wg-metric-plate` is 4.5% and widgets already
shipped from that scope read it. The v3 widget declares its own, in its own `widget.css` (§4).

Consequence at Stage 3: `plate-today`, `plate-peak`, `plate-low` and `plate-avg` report a fill-alpha gap
against every card artboard. Divergence §8.1.

### D3 (was B3) — the dialog has no cast shadow

Annotation `dialog-note` wins, and the kit already agrees with it. `0 24px 60px rgba(0,0,0,0.14)` (0.45
in dark) is dropped from both windows. The dialog is told apart by its edge, which is the kit's
`.wg-dialog` unmodified: `inset 0 0 0 1px color-mix(in srgb, var(--text-normal) 12%, transparent)` — 12%,
where the artboards compose 9%. Both the missing layer and the three points of edge are accepted, and
nothing is overridden from outside to restore either. Divergence §8.2.

### D4 (was B4) — the kit's calendar stands: 42 cells, six rows

`src/kit.js:1031` is `CALENDAR_CELLS = 42`, carrying the kit's own `TRADE-OFF:` that six rows keep the
panel from changing height between months (verified: read `src/kit.js:1025-1031`). It is accepted as it
stands. **`src/kit.js` is not edited, and the sixth row is not hidden from outside.**

The sixth row adds roughly 39px to the grid and the same to the dialog: `cal-grid` 223.2 becomes 262.6,
`add-dialog` 415.5 becomes 455.

Stage 2 records this at the call site in the widget source, as a `TRADE-OFF:` line naming the kit's six
rows and the height they cost, in the fewest possible words — the only comment the house rules admit for
it. Divergence §8.5.

### D5 (was B5) — the tile's dark shadow is the engine's, not the widget's

The tile chrome — radius, pad, fill, edge, shadow — belongs to `.wg-widget-root` and is painted by the
engine (`styles.css:708-780`). **The widget does not paint it and does not try to learn which theme it is
in.** No dark value is added to `--wg-widget-shadow`, and `styles.css` is not edited.

So a shadow gap on the `root` part of the `Bars` frame is out of the widget's scope, for that reason and
no other. Divergence §8.6. The same reasoning disposes of the dark `seg-thumb` and dialog shadows: with
no selector to branch on, the widget draws the light values everywhere and the dark artboards' numbers
are not implemented.

### D6 (was B6) — the dots are 11% of the ink, in both themes

Annotation `ink` wins over the dark artboards' 13%. `--wg-metric-dot` is already 11% in both themes and
is used as it stands. Divergence §8.3.

### D7 (was B7) — the add dialog opens on today

The selected day is **today**, which under the harness's pinned clock — `SETTLED_AT` is
`Date.parse("2026-09-13T09:00:00Z")` at `tools/v2-frame.mjs:18`, verified — is **13 September 2026**. The
artboard's `12 Sep` is its own sample and carries no rule.

`is-today` and `is-picked` therefore land on the same cell on open. The pairing holds either way, because
`cal-day-picked` is matched by class and not by position, so only the text and the cell's place in the
grid diverge. Divergence §8.7.

### D8 (was B8) — the four whole sentences

Each is authored whole, with the number interpolated into one literal. None is built by concatenation,
and the singular is a separate sentence because the verbs change with it. Chosen on `count === 1`; zero
takes the plural form.

| part | count | the sentence |
|---|---|---|
| `list-count` | plural | `${count} records · ${folder}` |
| `list-count` | singular | `${count} record · ${folder}` |
| `undated` | plural | `${count} records carry no date and stand outside every number on the card` |
| `undated` | singular | `${count} record carries no date and stands outside every number on the card` |

The separator in the count is U+00B7 MIDDLE DOT, as §4 records. The `undated` band is not drawn when the
count is zero. Every string is English and must pass `npm run lint:lang`.

### D9 (was B9) — the scrim is 0.22 in both windows

`--wg-overlay-scrim` is the kit's and is used unchanged; `styles.css:612` carries its reason.
RecordList's 0.32 is stale. Nothing measurable changes, since no part selects the scrim — recorded so
nobody matches 0.32 by hand. Divergence §8.4.

### D10 (was B10) — the amount field's unit is solved from outside the kit

`Field` (`src/kit.js:445-454`) renders a label wrapping an optional icon and an input, and has no unit
slot. Stage 2 solves it **from outside**: a wrapper around the field, or an override class on
`.mt3-amount` that places the `amount-unit` span with `margin-left: auto`. **`src/kit.js` is not
edited.**

If Stage 2 finds it genuinely impossible from outside, that is a **refusal to report** — stop and say so
— not a licence to edit the kit.

---

## 7. Still open

Three items. None blocks Stage 1, and each says what a later stage may do without an answer.

### O1 — the manifest's sizing fields

`defaultSize`, `maxSize`, `collapseBelowPx`, `stackBelowPx` and `tallestPx` are the catalogue card's, not
the ladder's, and no annotation gives a number for any of them. D1 settles the `@container` widths only.
Stage 2 writes `defaultSize` and `maxSize` from the frames that are drawn — 840 x 480 is the widest — and
**leaves the three `*Px` fields out** rather than inventing them. If one turns out to be required, stop
and ask.

### O2 — height

Every breakpoint in the spec is a width. The content column absorbs height on its own
(`margin-top: auto` on the foot), and the three artboards' heights — 480, 300, 320 — are drawn, not
specified. Nothing says what happens when the tile is too short for headline + plates + foot. Stage 2
authors no height breakpoint: let the column shrink, and report what it does.

### O3 — the headline above 999K

The rule inferred in §4 — three significant figures, trailing zeros after the point trimmed, `K` above
1000 — is drawn for six values, none above 999K, and `M` appears nowhere. Stage 2 implements what those
six support and no more.

---

## 8. Accepted divergences

The list Stage 3's three reviewers are handed. **Every item here is authorised by a decision in §6 and
must not be counted as an error.** A reported gap that is not on this list is a real finding.

1. **Plate fill alpha** — frames `Main`, `Bars`, `Medium`, `Compact`; parts `plate-today`, `plate-peak`,
   `plate-low`, `plate-avg`. Artboard: ink at 4.5%. Implementation: ink at 6.5%. Authorised by **§6/D2**
   (annotation `glass` over the artboards).
2. **Dialog shadow and edge** — frames `AddRecord`, `RecordList`; parts `add-dialog`, `list-dialog`.
   Artboard: two layers — an inset edge at 9% plus a cast `0 24px 60px rgba(0,0,0,0.14)`, 0.45 in dark.
   Implementation: one layer, the kit's inset edge at 12%, no cast shadow. Authorised by **§6/D3**
   (annotation `dialog-note`, which the kit already follows).
3. **Dot ink in dark** — frame `Bars`; part `chart`, read inside the SVG as the pattern circle's fill
   rather than as a measured box. Artboard: `rgba(218,218,218,0.13)`, 13%. Implementation: 11%.
   Authorised by **§6/D6** (annotation `ink`).
4. **Scrim in the dark dialog** — frame `RecordList`; the stage, which no part selects. Artboard:
   `rgba(0,0,0,0.32)`. Implementation: `--wg-overlay-scrim`, `rgba(0,0,0,0.22)`. Authorised by
   **§6/D9**.
5. **The calendar's sixth row** — frame `AddRecord`; parts `cal-grid`, `calendar`, `add-dialog`, height
   only: width, radius, fill and paint all agree. Artboard: 35 cells in five rows — `cal-grid`
   274 x 223.2, `add-dialog` 560 x 415.5. Implementation: 42 cells in six rows — `cal-grid` 274 x 262.6,
   `add-dialog` 560 x 455, roughly 39px taller. Authorised by **§6/D4** (the kit's `CALENDAR_CELLS = 42`
   stands; `src/kit.js` is not edited).
6. **The tile's shadow in dark** — frame `Bars`; part `root`. Artboard: `0 6px 47px rgba(0,0,0,0.28),
   0 4px 8px rgba(0,0,0,0.16)`. Implementation: the engine's `--wg-widget-shadow`, `0 6px 47px
   rgba(0,0,0,0.035), 0 4px 8px rgba(0,0,0,0.005)`. Authorised by **§6/D5** — the tile chrome is
   `.wg-widget-root`'s, drawn by the engine, and the widget neither paints it nor learns the theme. The
   dark `seg-thumb` and dialog shadow numbers fall the same way for the same reason.
7. **The selected day** — frame `AddRecord`; part `cal-day-picked`, text and grid position only: the box
   is identical and the pairing matches by class. Artboard: the 12th is picked and no cell is today.
   Implementation: today is picked — the 13th, from the harness's pinned clock — so one cell is both.
   Authorised by **§6/D7**.

Two further gaps are **not** divergences in this sense, because no decision produced them: they follow
from the harness's own data and are already recorded in §5. `list-dialog` and `records` are short — the
artboards draw six rows where the harness feeds 62 records into a dialog the kit caps at
`max-height: 70vh` — and every number on the screen differs, because the harness's records total 5096
over its 30-day window, so the card reads `5.1K` where the artboard reads `3.15K`. Only the formats in
§4 are the contract.
