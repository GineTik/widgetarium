# A tier list, and the family that holds it

`TASK` · 2026-09-12 · owner: unassigned · repo: widgetarium · design: `docs/tier-list.md`

## TL;DR

`@rank/tier-list`: cards dragged into named rows, everything unranked in a sticky tray, ten presets.
A row's name is its identity, so renaming rewrites the cards under it. A row's colour is a kit tone
name mixed into a rail, never a hex, so both themes come out of one declaration.

## What was true before this

| fact | evidence |
|---|---|
| four families, none comparing things to each other | `widgets/@core`, `@task`, `@habit`, `@inline` |
| the kit has eight tones, and `neutral` has no class at all | `src/kit.js` `TONE_CLASSES` |
| no `--wg-kit-*` token carries a tone's undiluted hue — only its wash and its ink | `styles.css` |
| a tile-bound list can be created, updated and removed one row at a time, never replaced whole | `src/gateway/props.js` `hardcodeWrites` |
| an unwritten typed row's `ref` is its index — `i0`, `i1` | `src/gateway/create.ts` `toRows` |
| a widget can write its prop's `value` and nothing else of the binding | `src/surface.js` `patchProp` |
| `@task/kanban-board` moves cards with HTML5 drag-and-drop, which no touch screen fires | `widgets/@task/kanban-board/widget.tsx` |

The last two settle two questions the design would otherwise have argued about: a preset cannot
create a folder and bind itself to it, and the drag has to be pointer events.

## The decisions

| question | taken | because |
|---|---|---|
| a row's identity | its name | `record-identity.md` moved exactly two references to ids and said the rest stays. A typed row's ref is positional, a folder note carries no key, and nothing holds a key unique — the settings window edits the same rows as YAML |
| where a rank lives | a field of the card | a card is in exactly one row by construction |
| a row's colour | a kit tone name | eight tones already invert with the theme; a hex does not, and nobody guarantees the label's contrast on it |
| who owns tone to hue | the kit | the board already keeps a second copy; a third would mean a ninth tone reaches nothing |
| the order inside a row | the middle between neighbours, whole numbers again when the middle collides | a pure fractional index exhausts the mantissa after about fifty drops into one slot and then stops listening, silently |
| no rows at all | a drawn state | the settings window edits the same list, so a guard inside the widget is a guard with a way around it |
| what a preset fills | the tile, in one write per list | a widget cannot rebind its own prop, so a preset that makes a folder could never attach to it |

## Order of work

### 1 · The kit owns the hue behind a tone — `DONE`

`styles.css` gains `--wg-kit-<tone>-hue` for all eight, `neutral` included.

### 2 · A tile-bound list can be replaced whole — `DONE`

`src/gateway/props.js` — `hardcodeWrites` gains `replace(rows)`, minting a ref for any row that
arrives without one. `src/gateway/refs.ts` — `replace` joins `COLLECTION_WRITES`, so a binding by
ref forwards it. The folder gateway does not supply it; presets are therefore offered only where
`can()` says yes.

### 3 · The family and its laws — `DONE`

```
widgets/@rank/
├── tokens.css        tone -> hue, the two mix percentages, the ground the fog fades to
├── lib.js            rackOf · orderBetween · placedAt · renumbered · pictureOf
│                     toneForSeed · cardSizeOf · freeLabel · PRESETS
└── tier-list/
    ├── manifest.json the catalogue card: id, title, keywords, sizes, preview
    ├── widget.tsx    props declared beside the component, per the new authoring shape
    └── widget.css
```

### 4 · The widget — `DONE`

```
  head          title · count · Presets · Reset
  ─────────────────────────── fog in, only when something scrolled past
  rack          rail | pen of cards          (scrolls)
                rail | pen of cards
                + Add a row
  ─────────────────────────── fog in, only when something is below
  orphans       filed under a row that is gone -> put them in the tray
  tray          Unranked · cards · [+]       (sticky, never scrolls away)
```

Cards move by pointer drag or by tap-then-tap. Both end in one write carrying the row and the place
in it together.

### 5 · The gates — `DONE`

| gate | what it holds |
|---|---|
| `npm run test:rank` | 38 checks: the laws, and the drawn widget over a fake vault |
| `npm run test:paint` | the rail's contrast, eight tones by two themes, floor 4.5; the fog off at rest and in once scrolled; the tray under the rack |
| `npm run test:props` | the engine's resolved props for this widget, pinned |

Both new gates were falsified before being trusted: dropping the duplicate-label guard turns the
rack check red, returning the midpoint unconditionally turns the order check red, and raising the
mix to 78% drops orange to 4.14 and teal to 4.39. Restored by md5 each time.

Measured rail contrast, ink against fill:

| | error | warning | standout | success | info | note | accent | neutral |
|---|---|---|---|---|---|---|---|---|
| light | 8.31 | 5.16 | 6.94 | 6.97 | 6.58 | 5.45 | 8.21 | 7.49 |
| dark | 6.84 | 7.34 | 5.64 | 8.99 | 6.07 | 6.96 | 6.30 | 7.67 |

### 6 · Decomposition and review — `DONE`

Six micro-reviews and the decomposition scanner, applied in one pass. Every eslint must-fix is
gone; what the scanner still reports is lizard, which cannot parse `.tsx` and names functions that
are not there.

| review | taken |
|---|---|
| duplication | the tone table was an exact copy of the kit's — `TONE_NAMES` and `toneClass` are imported now. Four more copies named as debt: `freeLabel` against `freeUntitled`, the seed-to-tone hash against two widgets that each carry one, `placedAt` against the kanban's `movedWithin`, and the row lifecycle itself |
| naming | `--wg-kit-<tone>-hue` held a whole colour, not a hue — the kit's half-built set of bare tone colours is completed instead. `usePreset` was not a hook, `Grip`'s `at` shadowed a loop index, `within` was not a predicate, `RankProps` was named after the package |
| dead code | the CC0 attribution was written and never drawn — it reaches the preset gallery now. One unused rule and one unread probe field gone |
| typed boundary | two casts hid that preset rows carry no `path`; `replace` takes `Row<Partial<T>>[]`, which is what the tile actually stores, and the casts are gone |
| conditionals | one `may` object instead of four repeated `canDo` calls; one `isRenamed`; one comparator behind both sorts |
| flow | the preset write moved in beside every other write; the ranked count is `rackOf`'s to own; the attachment no longer re-renders on every pointer move; the fog binds its listeners once and only repaints per render |

## Blocked

`npm run test:paint` cannot run: another branch's untracked `src/docs.js` imports two `.md` files
and the probe bundler has no loader for them, so every probe fails to build before a single check
runs. The last complete run, before that file appeared, was clean — eight tones by two themes, the
fog off at rest and in once scrolled, the tray under the rack.

## Left undone

- **Renaming a row is one write per card under it.** Nothing reports where it stopped if one fails.
  Reset carries the same shape.
- **`replace` is tile-only.** Naming it on the folder gateway is a step in the engine, not here.
- **`default.sort` is not baked for a tile-bound collection** while the settings window still draws
  a Sort group for it. This widget sorts in its own code; the asymmetry is left as it was found.
- **Pointer drag is proved only in headless Chrome.** Tap-to-place is the path that does not depend
  on the gesture.
- **Five hundred cards is unmeasured.** A vault attachment is drawn through the host's markdown
  renderer per distinct path; at that scale the answer would be windowing the tray.
