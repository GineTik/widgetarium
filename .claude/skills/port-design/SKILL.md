---
name: port-design
description: Strict staged port of a Claude Design canvas into a Widgetarium widget, one agent per stage — frame census, pure TSX, kit mapping, then three reviewers in parallel measuring geometry, the responsive ladder and the contract. Use when moving `.dc.html` artboards under `docs/reference/` into `widgets/`, when a design was redrawn and the widget must follow it, or when the user says "port design", "/port-design", "перенеси дизайн".
---

# Strict 1:1 design porting protocol

You are a frontend QA engine, not a designer. The design is the specification. Your job is to make
the built widget measure the same as the artboards, and to prove it with a tool rather than a claim.

## Who runs what

Every stage is a **separate agent with clean context**. An agent is given its inputs, does its one
stage, prints its checkpoint marker, and stops. It never starts the next stage — a stage that
reviews its own output reviews nothing.

| stage           | agents             | given                                       | returns                                              |
| --------------- | ------------------ | ------------------------------------------- | ---------------------------------------------------- |
| 0 — census      | 1                  | every artboard, `tools/v2-frame.mjs` FRAMES | frame census: ladders, distinct UIs, breakpoint spec |
| 1 — pure TSX    | 1                  | census, artboards                           | `widget.tsx` + `widget.css`, no kit                  |
| 2 — kit mapping | 1                  | census, stage 1 output                      | same files, kit components, geometry restored        |
| 3 — review      | **3, in parallel** | census, stage 2 output                      | three independent reports                            |

Spawn stage 3's three agents in **one message with three Agent tool uses** so they run concurrently.
They do not talk to each other; the orchestrator merges their reports.

## What is ported, into what

| side           | where                                              | what it is                                                                    |
| -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| design         | `docs/reference/<name>-draft/<Frame>.dc.html`      | a Claude Design artboard: markup inside `.stage`, CSS in `<helmet><style>`    |
| spec           | sticky notes on the same canvas                    | the behaviour the artboards cannot show — what drops, and at what width       |
| implementation | `widgets/<scope>/<name>/widget.tsx` + `widget.css` | the widget the engine mounts                                                  |
| pairing        | `docs/reference/<name>-draft/pairs/<Frame>.json`   | part name → `{ design: <selector>, impl: <selector> }`, plus the frame `size` |

There is **no Tailwind in this repository**. "Exact geometry" means every declaration — padding,
gap, border-radius, font-size, font-weight, line-height, letter-spacing, shadow layers, colour —
carried into `widget.css` under the widget's own class prefix. A utility class named `p-4` in a
source design is a value to read, never a class to keep.

## Non-negotiable constraints

1. **No initiative.** Simplifying, merging stages, rounding a number, or dropping a layer because it
   "looks the same" is a failure, not a judgement call. "I thought this was better" is the single
   worst sentence you can write in this flow.
2. **Checkpoints are printed.** Each stage ends with its literal marker on its own line. A stage with
   no marker did not happen.
3. **Geometry is exact.** Every value above matches the artboard. Where the design and the kit
   disagree, the design wins and the kit is overridden from outside.
4. **The library is never edited.** `src/kit.js`, `src/dialog.js` and `styles.css` are reused as they
   stand and restyled from outside. A look the kit cannot be made to take from outside is a
   **finding to report**, not a licence to write a replacement component.
5. **Colours are tokens.** `--wg-kit-*` and the widget's own custom properties. A hex literal in
   `widget.css` that the design did not itself hardcode is a defect.
6. **Comments: `TODO:` and `TRADE-OFF:` only**, fewest possible words. A hook blocks the rest.

---

## Stage 0 — frame census

**Claude Design has no concept of responsiveness.** Every breakpoint is drawn as its own artboard —
a separate HTML block with its own frozen width. Nothing in the canvas says which artboards are one
UI at three widths and which are three different UIs, and nothing says what happens at the widths
between them. That judgement is this stage, and it is made once, in writing, before any code.

The census agent reads every artboard, the sticky notes, and the frames table in `tools/v2-frame.mjs`,
then classifies.

**The rule for classifying.** The frames table carries the axes:

```
Main:       theme light, view curve, tile 840x480
Bars:       theme dark,  view bars,  tile 840x480
Medium:     theme light, view curve, tile 460x300
Compact:    theme light, view curve, tile 266.67x320
AddRecord:  theme light, view curve, opens add
RecordList: theme dark,  view curve, opens list
```

- Frames differing **only in `tile`** are one UI on a responsive ladder — `Main → Medium → Compact`.
- Frames differing in `view`, `theme`, `opens` or `hovers` are **different UIs**, measured
  separately, never interpolated into each other.

The census names, for each ladder: the ordered frames with their widths, and **the written
breakpoint spec** lifted from the sticky notes — what appears and disappears, at which width, in what
order. Where the canvas states it, quote it; where it does not, say so and stop for the user, because
inventing a breakpoint is inventing a design.

The census also names which pairs files exist and which frames have none.

Write it to `.tasks/<task>/artifacts/frame-census.md`. Every later agent is given this file.

```
[CHECKPOINT 0 PASSED: Frames classified into ladders and distinct UIs, breakpoint spec recorded]
```

---

## Stage 1 — pure structural port

Produce `widget.tsx` reproducing the artboards' DOM, and `widget.css` reproducing their style sheets.
No kit components yet.

- Same element order, same nesting depth, same tag semantics as the artboard.
- `class=` becomes `className=`; class names take the widget's prefix (`.title` → `.mt2-title`), and
  the rename is total — no artboard class name survives.
- Every declaration from the `<helmet>` sheet moves to `widget.css`. Nothing is "cleaned up".
- Exact literal text, dates and number formatting from the artboard (`12 Sep`, `19 records`). A
  formatter is written to emit exactly that string.
- Conditional parts stay conditional: a band the design draws empty must not render at all
  (`{hasWarning && <WarningBanner />}`), not render as an empty box.
- **Every part named in a pairs file carries a handle**: `data-part="<name>"` on the element, or a
  stable prefixed class. A part with no handle cannot be measured and will read as absent.
- Inline SVG (charts, patterns, gradients) is copied with its own numbers intact — a `<pattern>` tile
  of 14 stays 14.
- **The ladder is authored here, not discovered later.** The widest frame is the base; each step down
  the census named is a `@container widget` block. Width never goes through `@media` in a widget:
  `styles.css:713` gives every tile `container-type: inline-size; container-name: widget`, so a media
  query would answer the Obsidian window instead of the tile it lives in. `@media` in a widget is for
  user preferences only — `prefers-reduced-motion`, and nothing else.

```
[CHECKPOINT 1 PASSED: Pure TSX generated with exact CSS/HTML attributes]
```

---

## Stage 2 — gradual kit mapping

Replace base elements with kit components one at a time, re-measuring after each.

Imports come from `widgetarium/kit` (`Button`, `IconButton`, `Field`, `Segmented`, `Popover`,
`Calendar`, `Progress`, `Switch`, `Icon`, `Pill`, `Card`, `List`, `Row`) and dialogs from
`widgetarium`.

**Critical condition.** A kit component arrives with its own padding, height, radius and type. Where
that differs from stage 1, restore the stage 1 geometry with an override class on the component
(`className="mt2-add"`) or a wrapper. Two traps, both of which have already cost this project rounds:

- **Selector weight.** The kit's own rules can outrank a flat class in the widget sheet. An override
  that lost on specificity looks identical in the source and does nothing on screen. Verify by
  measurement, never by reading the rule.
- **The `::before` layer.** Kit controls paint fill and corner on a `::before`; the element itself is
  `border-radius: 0` by design. A radius override must go through the same pseudo-element.

Conditional rendering and the container blocks from stage 1 are preserved verbatim through this
stage. A kit component that brings its own intrinsic minimum width can break a ladder step without
breaking the widest frame — leave it for stage 3B to measure rather than pre-emptively patching it.

```
[CHECKPOINT 2 PASSED: UI Kit applied without geometry breaking]
```

---

## Stage 3 — three reviewers, in parallel

**A checklist you tick yourself proves nothing.** Every reviewer's output is a tool run.

Shared rendering command — renders the built widget into a tile of the frame's measured size, in the
frame's theme, refusing to hand over a page the widget threw on:

```bash
node tools/v2-frame.mjs --frame Main --css widgets/@default/<name>/widget.css --out /tmp/impl-Main.html
```

`--css` may be repeated. `tools/design-diff.mjs` then measures both sides part by part and reports at
three levels: `error` (outside tolerance, or a part one side draws and the other does not), `warn`
(inside the loose band), `note` (unmeasurable, e.g. typography where neither side has text).
Tolerances are `TIGHT_DELTA`, `LOOSE_DELTA`, `SLOP` in `tools/design-diff.mjs`.

### 3A — geometry

One frame at a time, every frame the census listed, ladder steps and distinct UIs alike:

```bash
node tools/design-diff.mjs --pairs docs/reference/<name>-draft/pairs/Main.json --impl /tmp/impl-Main.html
```

Reports per-frame `parts paired`, `errors`, `warns`, and the worklist of erroring parts. Does not fix.

```
[CHECKPOINT 3A PASSED: Geometry measured on every frame]
```

### 3B — the responsive ladder

This reviewer owns what the design does not contain. The artboards are static snapshots at three
widths; the behaviour **between** them was authored by stage 1 and was never drawn by anyone.

It checks, per ladder from the census:

1. **The breakpoints are where the spec says.** Read `@container widget` blocks in `widget.css`
   against the census's written spec. A breakpoint at 410 where the note says 400 is an error, not a
   rounding.
2. **The mechanism is `@container widget`.** A width-based `@media` is a defect regardless of how it
   renders in the harness, because it reads the wrong box.
3. **Each step matches its own frame.** Cross-check against 3A's numbers for the ladder frames rather
   than re-measuring them.
4. **The gaps are swept.** Render the widest ladder frame and step its tile width down through the
   ladder — at minimum the breakpoint values and one width either side of each. Look for overflow,
   clipped or wrapped-to-two-lines text, overlapping parts, a control that vanished at a width the
   spec did not name, and a fluid `clamp(…cqw…)` that inverts or collapses between its bounds.
5. **The manifest agrees with the sheet.** `collapseBelowPx`, `stackBelowPx` and `shortestPx` in the
   widget's `manifest.json` must not contradict the CSS breakpoints — the engine stops mounting parts
   at those numbers, and a sheet that disagrees produces a state nobody designed.

Reports the ladder, each breakpoint as spec-value vs code-value, and every width at which something
broke. Does not fix.

```
[CHECKPOINT 3B PASSED: Responsive ladder verified across frames and between them]
```

### 3C — contract

Everything the differ cannot see:

- Literal texts, date formats and number formatting against the artboards, character for character.
- Conditional parts: the empty case renders nothing, not an empty box.
- No hardcoded colour the design did not itself hardcode; all else through `--wg-kit-*`.
- Comment policy, `TODO:` / `TRADE-OFF:` only.
- The standing gates:

```bash
npm run test:design
npm run test:canvas
npm run lint:lang
```

```
[CHECKPOINT 3C PASSED: Contract, tokens and gates verified]
```

---

## Merge, falsify, install

The orchestrator merges the three reports. **Any `error` count above zero sends the worklist back to
stage 2** — a fresh stage 2 agent, given the reports, not the reviewer that found them.

**Falsification.** For any check added or pairing introduced, break the source on purpose once,
confirm it goes red, restore with a uniqueness-asserted targeted edit, and verify by md5. A check
that cannot be broken is deleted, not shipped.

**The vault.** A green measurement is not a change a person can see:

```bash
npm run dev
```

`@default` is a **published copy, frozen** — an edit to the repo never reaches it. Other scopes are
symlinks. Check before believing an edit landed:

```bash
ls -la "$WG_VAULT/.widgetarium/widgets"
```

```
[CHECKPOINT 3 PASSED: Final Verification Complete]
```

---

## Shortcut for small components

If the source markup is under 15 lines, sits on **one** frame with no ladder in the census, and
touches no kit component whose geometry can drift — one isolated button, badge or label — stages 1
and 2 may be done by a single agent in one step, noting:

```
[SHORTCUT APPLIED: Component < 15 lines]
```

Stage 0 and stage 3 are never skipped. With no ladder, 3B reports that and passes.

---

## Refusals

Stop and report rather than invent, when:

- the canvas names no breakpoint for a ladder it clearly has — the widths between the artboards are a
  design decision, and guessing one ships a screen nobody drew;
- the design asks for a look the kit cannot take from outside, and taking it would mean editing
  `src/kit.js`, `src/dialog.js` or `styles.css`;
- a part in a pairs file resolves on neither side — the selector is wrong, and guessing a replacement
  hides the mismatch;
- two artboards differ on an axis the census cannot classify as ladder or distinct UI;
- the design hardcodes a colour that has no `--wg-kit-*` token and none can be composed from those
  that exist.

Name the file and line, state what the design asks and what the code can give, and wait.
