# How widget grids scale — and what every shipping system refuses to do

`RESEARCH` · 2026-08-28 · artifact: https://claude.ai/code/artifact/793bcf77-a1ad-4a83-b942-942aa7ce62cc

## TL;DR

No shipping widget system hands a third-party widget an arbitrary width and also expects it to
look right. Every one of them restricts something: Apple restricts the size set, Android
restricts it to 2–4 declared layouts, Home Assistant lets the card declare a floor and the
grid honours it, Grafana abandons the grid entirely below a breakpoint, SharePoint publishes a
contract and holds the developer to it. We restrict nothing — the board promises it will never
refuse a width — so the whole cost lands on the widget author. That promise is the complexity
you are feeling, and it was adopted for a reason that turns out to be a different bug.

---

## 1. What is actually broken, named separately

Four things read as one mess on screen. They have four different causes and three of them are
cheap.

| what you see | cause | where it belongs |
|---|---|---|
| `Ux Tean`, `Galax` clipped | tab bars have no overflow behaviour | the widget's CSS |
| filter control is half a tile tall | the widget paints a control smaller than its tile | the widget's CSS |
| sidebar collapse → expand leaves a mess | collapse writes geometry, expand does not restore it | the board |
| gaps waste the phone screen | one gap value at every board width | the board |

**The grid is not the culprit for the first two.** A tile is an integer number of SQUARE cells
already: `cell = (inner − gaps) / columns` (`src/paths.js:81`) and a row is `cell + gap` tall
(`src/surface.js:909`). Nothing can occupy half a cell. What breaks the rhythm is a widget
drawing a 32px button inside a 90px tile and leaving the rest transparent — the tile obeys the
design system, the paint inside it does not.

That distinction matters, because it splits an unanswerable problem ("how do we make adaptive
layout work?") into one board question and a pile of ordinary CSS.

---

## 2. Prior art — five systems, five different restrictions

### Apple WidgetKit — restrict the SIZE SET

Widgets come in fixed families (small 2×2, medium 4×2, large 4×4). iOS 18 added corner
dragging, and it **snaps between the same families**. An app may support only one family, and
Apple's guidance is that a larger family should be a *different design*, not a scaled one.

There is no minimum because there is nothing to constrain: the author designs *for* a size.

### Android App Widgets / Glance — restrict to a DECLARED SET of layouts

Three modes, and the docs name the preferred one:

| mode | what the developer writes |
|---|---|
| `SizeMode.Single` | one layout, ignores resize |
| `SizeMode.Responsive` | **recommended** — 2–4 layouts, each valid for a size RANGE |
| `SizeMode.Exact` | a layout per exact size; wakes the app on every resize |

Android's own recommendation is **2–4 layouts**: "typically 2 sizes on phones, 4 on
foldables". The manifest declares `targetCellWidth`/`targetCellHeight` **in launcher cells**,
plus `minResizeWidth`/`maxResizeWidth` — and the widget must support that whole declared range.

The system renders each declared size once and caches it. The developer never writes
continuous adaptivity.

### Home Assistant sections — restrict via a card-DECLARED floor

The closest system to ours, and the most instructive.

```
section = 12 columns
cell     = section width / 12  (~30px)  ×  56px TALL, fixed
gap      = 8px
```

A card implements `getGridOptions()` returning `min_columns` (default 1), `min_rows`
(default 1), and optional `max_columns` / `max_rows`. A card that implements **nothing** takes
the full 12 columns. The docs recommend defaults that are multiples of 3.

Two things to steal:

1. **The row height is a fixed 56px unit.** Height is quantised by construction, so no card
   can be half a row — the property you want and currently only have horizontally.
2. **The minimum is honoured by the RESIZE UI**, not solved by a layout algorithm. You cannot
   drag a card below its `min_columns`. Nothing is ever dropped to another row to satisfy a
   minimum.

### Grafana — restrict by ABANDONING the grid

Below the medium breakpoint every panel becomes full width, one column, in order. The
dashboard layout is simply not attempted on a phone. Crude, unbeatable, and it is what a
mature product with millions of authored dashboards chose.

### SharePoint web parts — restrict by CONTRACT

Microsoft does not constrain the width at all; it publishes the developer's obligation:

> reflow down to a minimum width of 320px · use 100% max width · a fixed pixel width produces
> unexpected results at other widths

A full-bleed web part can be handed several thousand pixels on an ultrawide monitor, and the
docs say so explicitly, so the author tests it.

### gridstack / react-grid-layout — the two libraries

gridstack: six named column strategies (`none`/`move`/`scale`/`moveScale`/`list`/`compact`),
and the **widest layout is cached as the source of truth** so narrow→wide is lossless. It also
**stopped defaulting to one-column mode** because too many new users hit problems.

react-grid-layout: per-breakpoint layouts, no strategy, and a long-standing open issue that
items do not return where they were after shrink-then-grow. That is the model we implemented.

---

## 3. The finding: a minimum is a bound on the GRIP, not a term in the layout

We removed `minSize` because a minimum made tiles fall to the next row, which read as the
interface vanishing. The conclusion drawn was "minimums are the wrong tool". The prior art says
the conclusion was one step too far.

```
what we built                        what everyone else built

  drag ──► arrange() ──► a row that     drag ──► the GRIP refuses to go
           cannot fit                            below the floor
              │                                     │
              ▼                                     ▼
       something DROPS a row               nothing moves at all;
       (looks like a crash)                the resize just stops
```

Apple snaps, Android bounds the drag with `minResizeWidth`, Home Assistant bounds it with
`min_columns`. **In none of them does a minimum ever reach the layout algorithm** — so none of
them can produce the failure that made us delete minimums.

Today `startDrag` says it outright: "A drag is bounded by the BOARD and nothing else"
(`src/surface.js:715`). That line is the whole design decision, and it is the only one in this
document I would change.

---

## 4. The compromises, priced

You asked what the compromises are. These are the five that exist; every product picks 2–3.

| # | compromise | you give up | you get |
|---|---|---|---|
| 1 | the grip stops at the widget's floor | "any width you like" | a widget is never handed a size it was not built for |
| 2 | snap sizes (families) | fine-grained sizing | every size on screen was drawn by a person |
| 3 | one column below N px | the layout on a phone | a readable phone, zero widget work |
| 4 | chip + open-in-place below the floor | in-place detail when tiny | the tile never lies about what it can show |
| 5 | a published contract, tested | author freedom | a defect is the author's, not the platform's |

We already ship 4 (the chip). 1 and 3 are the two that would remove most of the pain, and
neither costs a widget author anything.

---

## 5. Options

### A — Bound the grip (Home Assistant's model)

`defaultSize` gains an optional `minSize`, used ONLY to stop the drag and to clamp a derived
width. `arrange` never sees it. Below the floor the tile becomes the chip we already have.

- **For:** kills the class of bug that made us delete minimums, without the reason we deleted it.
- **Against:** a widget with a badly chosen floor takes space it does not deserve.
- **Cost:** small — a clamp in `resizeBy`, and the floor is advisory everywhere else.

### B — Size families (Apple's model)

A widget declares 2–3 drawn sizes; the grip snaps between them.

- **For:** nothing on screen was ever invented by the machine.
- **Against:** kills free resizing, which is this editor's appeal; and it is MORE author work
  than one number, not less.

### C — One column below a threshold (Grafana's model)

Under ~480px the board stops being a board: tiles stack full width in reading order, the
authored layout untouched. Gaps shrink to 4px on the phone.

- **For:** removes the phone problem entirely, for every widget, forever, at no author cost.
- **Against:** the phone stops showing the layout you designed.
- **Note:** gridstack's warning applies — do this at a *threshold*, never as the default.

### D — Publish the contract (SharePoint's model)

One page: *your widget will be handed any width down to its declared floor; use 100% width;
never a fixed pixel size; here is the chip you get below the floor.* Plus a dev harness that
renders a widget at 6 widths at once so the author SEES it.

- **For:** turns "I might get perverted geometry" into a checklist.
- **Against:** documentation does not enforce itself — the harness is the part that works.

### Recommendation — A + C + D

Three moves, none of which touch `arrange`:

1. **`minSize` returns as a grip bound only.** One clamp, one manifest field, still optional.
2. **A phone threshold**: below ~480px, one column, small gaps, authored layout preserved.
3. **A six-width preview harness** in the dev vault, plus the one-page contract.

B is deliberately rejected: it costs the author more than A and removes the free resizing that
makes this thing worth using.

---

## 6. What this leaves the widget author

| how often | what they do |
|---|---|
| always | nothing — `defaultSize` and 100% width |
| sometimes | `@container` rules if the widget is dense |
| rarely | `minSize` if the widget genuinely cannot go below a width |
| never | design a phone layout, or handle a width below their floor |

Compare with today, where the honest answer to "what widths must I survive?" is "all of them".

---

## 7. The four things on screen, and what each one is

Independent of any option above:

- **Tab bars** (`board-tabs`, `view-tabs`) need overflow behaviour: scroll, or the Priority+
  pattern already used for the chip — visible tabs, then a "…" holding the rest. The
  "Marketing Team" bar becomes a single button opening the full list when it cannot fit two.
- **The filter control** should fill its tile: same radius as a tile, same height, centred —
  it IS a widget, so it should look like one.
- **Vertical centring**: tab bars paint at the top of their tile; centring them in the cell
  costs one line and removes most of the "crooked" reading.
- **Sidebar collapse must restore.** Collapsed-ness already lives on the tile (`folded`), not
  per width; the expand path needs to put back the width it took, which is what `wasW` is for.
  This is a bug, not a design question.

---

## Sources

- [Home Assistant — custom card `getGridOptions`](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [Android — Provide flexible widget layouts](https://developer.android.com/develop/ui/views/appwidgets/layouts)
- [Glance `SizeMode.Responsive`](https://developer.android.google.cn/reference/kotlin/androidx/glance/appwidget/SizeMode.Responsive)
- [SharePoint grid and responsive design](https://learn.microsoft.com/en-us/sharepoint/dev/design/grid-and-responsive-design)
- [Design considerations for SharePoint client-side web parts](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/web-parts/basics/design-considerations-for-web-parts)
- [Grafana — new dashboard grid & responsive (mobile) handling](https://github.com/grafana/grafana/issues/9996)
- [iOS 18 home-screen widget resizing](https://www.tomsguide.com/phones/iphones/how-to-quickly-resize-a-home-screen-widget-in-ios-18)
- [gridstack ColumnOptions](https://gridstackjs.com/doc/html/types/ColumnOptions.html)
- [react-grid-layout #1663 — items do not pop back when growing](https://github.com/react-grid-layout/react-grid-layout/issues/1663)
