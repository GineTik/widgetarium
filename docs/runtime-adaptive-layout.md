# Runtime adaptive layout

## TL;DR

Layouts stop being three named device classes and become entries keyed by **column
count**. A width the user never touched is derived live from the nearest authored
column count and never written to disk; the moment they drag anything there, that
column count becomes authored and is remembered forever. Column count itself is
derived from the available width against one target cell size, so the board always
fills 100% of its width and the cell size barely moves as the window is dragged.

## Why

Fixed column counts cannot hold the tap-target invariant. Measured on the current
config: a 300px Obsidian pane gives a 38.0px cell and an iPad in landscape (1194px,
desktop class) gives 42.9px — both under Apple's 44pt and Material's 48dp minimum.
The class range is simply too wide: `desktop` spans 1024px to infinity.

The three-tab model also makes adaptation a chore: the user must sit down and service
three boards they cannot currently see. Nobody does that.

Prior art: gridstack caches a layout per column count and restores it when that count
returns; react-grid-layout stores one layout per named breakpoint and derives the
missing ones. This design is gridstack's, with the derivation rule made explicit.

## Data shape

```yaml
tiles:                      # identity, unchanged
  - id: hero
    widget: "@crypto-wallet/hero"
layouts:                    # keyed by column count, only authored entries persist
  "4":
    places:
      - { id: hero, x: 0, y: 0, w: 4, h: 6 }
  "20":
    places:
      - { id: hero, x: 0, y: 0, w: 9, h: 7 }
```

An entry exists **only** if the user edited at that column count. There is no
`authored` flag, because presence in the file IS the flag — a derived layout is
never written. That removes a whole class of drift: nothing can be marked authored
without an edit, and nothing edited can fail to be marked.

### Migration

The three class names carry their current column counts, so the move is 1:1 and
lossless:

| old key   | new key |
|-----------|---------|
| `phone`   | `"4"`   |
| `tablet`  | `"12"`  |
| `desktop` | `"20"`  |

A bare top-level array (the pre-classes format) keeps its current meaning and lands
on `"12"`. An empty old layout migrates to nothing, not to an empty entry: an empty
authored layout and an absent one must not be confused, or every board would arrive
with three authored blanks and derivation would never run.

## Choosing the column count

```
inner   = availableWidth - 2 * padPx
columns = max(MIN_COLUMNS, round((inner + gap) / (targetCell + gap)))
cell    = (inner - (columns - 1) * gap) / columns
```

The last line is what makes the board exactly fill its width: there is no `maxCellPx`
ceiling and therefore no dead margin.

`round`, not `floor`. Flooring always overshoots the target, which widens the sawtooth
the cell rides as a column is added — measured, 25.0px of travel against 16.9px.

**Both the target cell and the gutter travel with the width**, interpolated between a
narrow and a wide anchor rather than stepped per class:

| | narrow (390px) | wide (1100px and up) |
|---|---|---|
| target cell | 84px | 68px |
| gutter | 8px | 16px |

The target moves because the two ends are constrained by different things: a phone shows
FEW cells and every one is a finger target, a monitor shows MANY and the pointer is
precise. Four columns on a phone is a consequence of that, not a special case.

Both must interpolate rather than step. Held per class, the gutter jumped 8 to 16 at
600px and a **wider** window then fitted fewer columns than a narrower one — 599px gave
seven columns, 600px gave six. The board reflowed backwards as it grew.

Measured on the built code:

| width | columns | cell | gutter |
|-------|---------|------|--------|
| 300 | 3 | 84.0px | 8.0px |
| 375 | 4 | 79.8px | 8.0px |
| 390 | 4 | 83.5px | 8.0px |
| 430 | 4 | 93.2px | 8.5px |
| 600 | 6 | 86.0px | 10.4px |
| 834 | 9 | 77.6px | 13.0px |
| 1194 | 14 | 68.1px | 16.0px |
| 1512 | 18 | 67.1px | 16.0px |
| 1728 | 20 | 69.6px | 16.0px |
| 2560 | 30 | 68.8px | 16.0px |
| 3440 | 41 | 67.5px | 16.0px |

Across 300–3440px: the cell spans 65–99px, the column count never decreases as the width
grows, the dead margin is 0px at every width, and the cell never falls under 48px. The
largest single-pixel step is 26.5px at 346px wide, where `MIN_COLUMNS` binds; above
375px it is 20.4px, and above 600px, 14.5px.

## Deriving an untouched column count

Two authored counts, 4 and 12. The window sits at 8. Which one is the source?

**Nearest by column distance; on a tie, the larger.**

```
 4      5   6   7  |  8   9  10  11      12
authored  <- from 4 |    <- from 12     authored
                    +-- the seam
```

Near the phone the board looks phone-like, near the monitor monitor-like, and the
seam falls at the midpoint — the width furthest from either authored state and the
one the user sits at least often. Deriving always-from-above instead would put the
seam at 4/5, hard against the authored phone layout, which is the worst place for it.

**Two authored layouts cannot be blended.** If a widget is top-left at 12 columns and
bottom-right at 4, no in-between exists; any interpolation would be invention. The
seam is therefore not removable — only placeable. It also heals: one edit at the seam
makes that count authored and the discontinuity is gone for good.

Derivation is the existing `generatePlaces`: scale `x` and `w` by
`toColumns / fromColumns`, clamp to the column count, then pack in reading order.

## No class tabs

The three class tabs are gone. They used to pick which of three layouts you edited —
under this design the column count picks it, so the tabs had no job left, and the one
they were given (previewing another width) they did badly: the label counted columns at
the preview width while the board clamped to the real pane, so on a 700px pane
"Tablet · 9" drew 8 columns and "Desktop · 18" also drew 8. Two of three buttons were
duplicates of each other.

What replaces them is a state chip that is always right: **"18 columns · yours"** or
**"· derived"**, with a Reset that forgets the width and lets it derive again.

The cost, accepted deliberately: a phone layout can now only be authored by actually
narrowing the window or the pane.

## Invariants

- The board width equals the available width exactly. No dead margin, no overflow.
- A place is clamped to the current column count **on read**, not only on write —
  otherwise a layout authored at a wider count draws outside the board.
- Only authored layouts are written. Derived ones live in memory for one render.
- The cell never falls below 48px (the tap target); with the target above it is a
  consequence of the formula, and `MIN_COLUMNS` is the guard at extreme widths.

## Verification

Without Obsidian:
- `npm run test:render` renders every demo note in reading and editing mode and
  fails if a cell leaks into reading mode or the grid draws none while editing.
- An arithmetic check that every place, after clamping, fits inside the board at
  every column count from `MIN_COLUMNS` to 45.
- A migration check: each old named layout arrives at its numeric key with identical
  coordinates, and an absent one does not become an empty authored entry.

In Obsidian, by hand:
- Drag the window slowly from phone width to full width; the column count climbs one
  at a time and no tile jumps outside the board.
- Edit at some untouched width, reload, return to that width: the edit is still there.
- Return to a width never edited: it is derived, and editing the neighbour does not
  overwrite it.

## Deferred

Per-width delete and add ("remove this widget here only", with a way to bring it
back). The hidden-widget tray already exists in the editing chrome; it becomes
per-column-count when this lands.
