# The design is measured, not eyeballed

`TASK` · 2026-09-13 · owner: unassigned · repo: widgetarium · plan: scratchpad `metric-total-v2-flow.md`

## TL;DR

`@default/metric-total` was written six times against a design nobody ever measured, and was rejected
on sight each time. V2 replaces the eye with an instrument: both the design artboard and the widget
render in real Chrome, and the parts are compared by name on shape class, colour distance in Lab,
size, shadow, blur and presence. The widget itself is then built by a pipeline of agents, one per
frame, each restyling the existing kit from outside.

## What is true today

| fact | evidence |
|---|---|
| the design is six hand-drawn artboards | `docs/reference/metric-total-draft/*.dc.html` |
| none of them renders on its own | each loads `./support.js`, absent from the repo |
| their markup carries `{{name}}` placeholders | resolved by the class in each file's `data-dc-script` |
| V1 exists and is rejected | `widgets/@default/metric-total/` |
| the kit is 1226 lines of components and 4043 lines of sheet | `src/kit.js`, `styles.css` |
| `test:canvas` proves only that artboards are not behind the widget | `tools/canvas-from-widget.mjs:192` |

The last row is the whole problem. Every gate this widget had compared the widget to itself. Nothing
ever compared it to the design.

## The instrument — `DONE`

| file | holds |
|---|---|
| `tools/design-diff.mjs` | measurement in Chrome, comparison by part name, the CLI |
| `tools/chrome-ask.mjs` | Chrome launch and one CDP question, reusable |
| `tools/color-distance.mjs` | sRGB → Lab, ΔE |
| `tools/artboard-support.js` | the shim that makes an artboard renderable without the canvas |

Pairing is by part name through a `--pairs` file: each part names a selector on the design side and
one on the implementation side, defaulting to `[data-part="<name>"]`.

Thresholds: `ΔE ≤ 2` is a match, `≤ 5` a warning, above it an error. A size differs when it is more
than 1px **and** more than 1% out. Shapes are compared as **classes** — circle, pill, rect with a
radius — never as numbers, because 999px and 22px on a 30px-tall control are the same pill.

Falsified, each mutation on a copy, the source md5-identical afterwards:

| mutation | verdict |
|---|---|
| `border-radius: 22px → 0` | RED on shape |
| `font-size: 15 → 19px` | RED on size |
| `backdrop-filter → none` | RED on blur |
| pattern step `14 → 28` | RED on pattern tile |
| tone `#1f8a4c → #1f4c8a` | RED on colour |
| `display: none` on the button | RED on presence |
| `extends DCLogic` broken | throws, rather than measuring a blank page |

**Two defects the falsification found in the instrument itself.** `color(srgb …)` was parsed as
0–255 and so every such colour read as black. Worse, a self-comparison reported zero differences when
**neither** side drew anything — the same silent pass that let `canvas-diff` go green over visibly
wrong buttons. Pairing is now counted and reported separately: `AddRecord` honestly says
`1 of 10 parts paired` against the card's selectors.

### What review then found in it

| finding | what it was | now |
|---|---|---|
| the pairing verdict had two owners | `compared` returned `[]`, the CLI recomputed the same condition and called it an error — so any other reader of `reported()` got silence on the input the CLI failed | `compared` owns it; the CLI counts what it returns |
| the failure message guessed its own cause | `__READY__` false was always reported as "never finished drawing", whatever actually threw | the page collects `window.__err` and the message carries it |
| the readiness guard was opt-in | `requireReady` was a per-call argument, and the implementation side was never checked — a widget that threw read as "absent everywhere", which looks like a measured difference | readiness is unconditional; both sides hold the same `__READY__` contract |
| a fixed 900ms settle | a page that had not finished was measured as it stood | polls `__READY__` to a deadline, then fails naming the page's own error |
| the debug port was random | a collision reads another Chrome's page and measures the wrong thing | `--remote-debugging-port=0` and `DevToolsActivePort`, which is what `tools/substitution-test.mjs` already did |
| a throw leaked Chrome, and a dead socket hung forever | no `finally`, and `send` resolved only on an answer | `finally` closes; the socket's close and error reject every pending call |
| "transparent" and "I could not read this colour" were one answer | and alpha other than exactly 0 was discarded, so two colours differing only in opacity matched | three answers — colour, transparent, unreadable — and alpha is compared |

**One claim from review that was checked and refused.** The principles reviewer reported that the
artboard path never works, having run it against `.design/substitutions/DenseA.dc.html`. That file
carries neither `data-dc-script` nor a `Component` class; all six design artboards carry both, and all
six render and measure. The underlying complaint was still right — the error message named the wrong
cause — and that is fixed above.

`npm run test:design` is the gate: sixteen checks, each a real mutation on a copy of an artboard, the
source untouched. It runs inside `npm test`.

**Where the surface choice can still be wrong, and what says so.** Picking `::before` is a guess about
intent, and it is wrong for an element that paints a fill of its own *and* carries a painting
`::before` — the element's fill would go unread. That case is now reported rather than guessed at:
the record carries `shared`, and a part where both surfaces paint is an error naming the ambiguity.
`::after` is still not read at all; nothing in the kit paints there today. The gate holds both halves
— dropping the ambiguity condition turns `one painted surface, not two` red, and the file was restored
and md5-verified (`db8b15f4…`).

**The `::before` checks read a generated file.** `docs/reference/metric-total/Main.dc.html` is written
by `npm run canvas` from v1, which V2 is meant to replace, so the fixture is on a clock. A presence
check runs first, so the day it stops holding a kit control the gate says that plainly instead of
failing with a confusing colour comparison.

### The kit paints on `::before`, and the first run read the wrong node

Measuring v1 against the design reported every kit control as `rect r=0` with a transparent fill and
no blur. That is not v1 being wrong — it is the house rule: the kit's controls paint fill and corner
on a `::before`, and the element itself is `border-radius: 0` by design. The instrument now reads the
`::before` for fill, corner, shadow and blur whenever that pseudo-element is the one painting, and
falls back to the element otherwise. Six of the twenty-two findings in the first run were this
phantom. Both halves are gated: breaking the surface choice turns the two `::before` checks red, and
the file was restored and md5-verified.

### v1 measured against the design — the baseline v2 has to beat

Sixteen errors over eleven parts of the widest frame, and they confirm the plan's central claim:

| part | what | design | v1 |
|---|---|---|---|
| add | height | 38 | **34** — the kit's `is-s` |
| add | width / padding | 135.9 / `0 20 0 16` | 129.2 / `0 16 0 16` |
| icon | width, height | 38 | **32** — the kit's `is-s` |
| icon | glyph size | 13.3 | 16 |
| period | height | 30 | 34 |
| period | width / padding / gap | 125 / `0 6 0 12` / 6 | 138.5 / `0 16 0 16` / 8 |
| period | weight | 500 | 600 |
| period | ink | 55% mix of the ink | `--text-muted` |
| seg | width / glyph | 64 / 16 | 66 / 14 |
| trend | width | 64.8 | 61.3 |

Every size v1 tried to set from outside is the kit's own number, unchanged. Nothing was overridden;
the rules lost on selector weight and no one noticed for six rounds.

## The pipeline

| stage | who | out |
|---|---|---|
| 1 | planner → three blind reviewers → planner, two rounds | decision page, six frame sheets, markup skeleton |
| 2 | one agent per frame, clean context | that frame's sheet of styles |
| 3 | merger | one widget, one sheet |
| 4 | one reviewer per frame | measured differences |
| 5 | the frame's own agent | fixes |
| 6 | 4 → 5 | empty review or two rounds, then stop |

Four anchor frames are built first — `Main`, `Bars`, `AddRecord`, `Compact` — per the plan's own
default. All six are catalogued.

**The library is never edited.** `src/kit.js`, `src/dialog.js` and `styles.css` are reused as they
stand and restyled from outside. A look the kit cannot be made to take from outside is a finding, not
a licence to write a replacement component.

## The loop a frame agent runs

```
node tools/v2-frame.mjs --frame Main --css widgets/@default/metric-total-v2/Main.css --out /tmp/impl-Main.html
node tools/design-diff.mjs --pairs docs/reference/metric-total-draft/pairs/Main.json --impl /tmp/impl-Main.html
```

`tools/v2-frame.mjs` renders the widget into a tile of the frame's **measured** size — Main and Bars
840×480, Medium 460×300, Compact 269×255, the dialogs 560×329 and 560×245 — in the frame's theme, and
holds the same `__READY__` / `__err` contract the artboard shim does, so a widget that throws is
refused rather than measured as "absent everywhere".

First run against the unstyled widget: **20 of 20 parts paired, 79 errors.** Every selector resolves,
so that number is a worklist rather than noise, and it is the only signal a frame agent is given.

### What review found in the renderer

| finding | now |
|---|---|
| the settle loop gave up silently after 60 tries | it writes the selector that never matched, the frame and the button it pressed into `window.__err`, which the measuring tool already quotes |
| only `error` was collected, never a rejected promise | `unhandledrejection` is collected too, so an async gateway failure stops claiming the page reported nothing |
| the dialog opener was `buttons[0]` / `buttons[last]`, clicked again on every tick | pressed once, addressed by `[data-part="add"]` / `[data-part="open-list"]` |
| the clock was pinned only for the sample rows | the page replaces `Date` before the bundle runs, so the widget's own `isoOf(new Date())` settles too |
| "has it drawn" meant two different things | the probe now requires a non-zero box, the same condition the measuring tool calls `present` — otherwise a page that never laid out reads as a design difference |
| the default window size was written in two files | only the frame carries it |

Both dialog frames were then rendered and probed: AddRecord draws 7 of 7 parts, RecordList 6 of 6, so the
press-by-name path works for both. The instrument's own gate stayed green through all of it.

### The first frame: 79 → 5

`widgets/@default/metric-total-v2/Main.css`, 172 lines, written by one agent that never saw this
conversation, checked only by the loop above. No literal colour anywhere in it: the plate corner is
`calc(var(--wg-kit-plate) + var(--wg-kit-plate-pad))` and the surface corner
`calc(var(--wg-widget-radius) - var(--wg-widget-pad-surface))`, both arithmetic rather than 22 and 8.

Three of the eight it could not close were the **instrument's** fault, not the widget's, and both
causes would have poisoned every later frame:

| | was | now |
|---|---|---|
| every text box differed for good | the artboard is drawn in `-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter var"`, the harness gave the widget Helvetica Neue — same size, same weight, different family | the widget side is rendered in the design's own stack, so a width gap means a layout gap |
| `fontSize` compared on a node with no text | the artboard's icon button inherits the UA default 13.3px, the kit's resolves 16px, and neither paints anything — the button holds only an icon | type is compared only where a part actually reads: `fontSize`, `fontWeight` and `letterSpacing` are skipped when both sides are textless |

Review then found that the first of those corrections had reintroduced the disease it cured, and the
second was unfalsifiable:

| finding | now |
|---|---|
| the typeface was aligned but never **measured**, so the stack is written in `v2-frame.mjs` and in all six artboards and nothing catches a divergence | `fontFamily` is a compared property like any other; if an artboard is redrawn in another face, the run goes red instead of reporting meaningless widths |
| a skipped typography comparison looked exactly like a passed one | a part neither side reads yields a `note` record, and the summary counts them: `5 error(s), 0 warning(s), 3 not measured` |
| `reads` came from `textContent`, so a glyph drawn through `content:` would slip past | `::before` and `::after` content count as reading |
| `--font-interface` was declared twice in one rule, and `--font-text` / `--font-monospace` stayed on the harness's face | `host-themes.mjs` grew `fontsOf(stack)` and owns all three in one place |
| the new guard had no mutation against it | two: a part whose type is far apart but textless must stay unreported, and a changed face must be caught |

The identity check had to change with it — the design against itself now reports three `note` records,
because three of its parts hold no text. That is the instrument telling the truth about what it did
not look at, so the check asserts no **difference** rather than no output.

### The shadow was collected and never compared, and comparing it found a real defect

A dead-code review found `boxShadow` measured into the record and read by nothing, which made the
plan's own "shadow, layer by layer" check a thing the tool claimed and never did. Comparing it — layer
count, each layer's offsets, each layer's colour through the **same** verdict the other colours use,
so alpha counts — immediately reported `root shadow layers: design 3, impl 0`. The widget's tile had
no shadow at all.

The cause, probed rather than guessed: `styles.css:762` writes
`box-shadow: var(--wg-widget-edge), var(--wg-widget-shadow)`. `--wg-widget-edge` is built at `:root`
from `color-mix(in srgb, var(--text-normal) 4%, transparent)`, and the harness declared the host's
tokens on `body`. At `:root` there is no `--text-normal`, so that one custom property computed to the
guaranteed-invalid value, inherited as empty, and **the empty token voided the entire declaration** —
taking the two drop shadows with it. The harness now declares the host's tokens at `:root`, where the
sheet expects them, and the three layers match.

**Worth a decision beyond this task:** one absent token silently removes a frame's whole shadow. A
fallback in that declaration would make it fail softly instead. It is a one-line change to
`styles.css`, which this task may not touch.

Reviewing the shadow parser itself then found two more holes in it, both closed and both now gated:
`inset` is a keyword rather than a number, so it vanished in parsing and an inward ring compared equal
to an outward cast — which is exactly what the tile's own edge is; and a layer with a different count
of numbers was compared only as far as the design side reached, so a lost or extra value passed. The
colour pattern had also been written twice, two definitions of "what counts as a colour" that had to
stay in step; it is one named constant now.

`layersOf` read as 29 lines to the decomposition scanner and is nine: a parenthesis inside a regular
expression throws its counter off, the same way it cannot count `.tsx`. Naming the four patterns
cleared it and left the function plainer than it was.

**Five stand, and four of them are one decision.** `period` and `plate-label` want the design's muted
ink — `color-mix(in srgb, var(--ink) 55%, var(--ground))`, `#858585` — and carry `--text-muted`,
`#707070`, 8.2% apart and so past the ΔE ceiling of 5. The sheet chose the token deliberately: it is
the only muted ink the host ships and it is what `.wg-kit-seg` already paints, so hand-mixing here
would put three muted inks in one widget out of step. **This is a decision, not a defect**, and it is
the designer's: take the token and accept #707070, or mix and restyle the kit's muted ink to match.

The fifth, `trend` 64.8 vs 63.4, is the fixture: the artboard prints a hardcoded `66.0%`, the sample
records compute `73.9%`. Different text, so a different box. Not closable by CSS and not worth
reverse-engineering sample data to hide.

### Ten parts reach the DOM by class, not by `data-part`

A kit component that destructures a closed parameter list drops every prop it does not name before
`h()` is called. `Segmented`, `Icon`, `Calendar`, `MarkdownEditor` and `DialogContent` all do, so
`data-part` never lands on them; `className` does. `add-icon` and `open-list-icon` carried no class
and so had no handle at all — they now carry `mt2-add-icon` and `mt2-open-list-icon`. The pairs file
addresses these ten by class. The library is not edited to fix it: passing the attribute through would
mean a rest spread in the kit.

## Putting it where a person can see it

A green gate is not a visible change. `.widgetarium/widgets/@default` in the vault is a **published
copy**, not a symlink like every other scope, so nothing in this repo reached Obsidian and the
catalogue kept showing thirteen widgets. v2 is now published there the way v1 was:

```bash
node tools/publish.mjs widgets/@default/metric-total-v2 --out "$WG_VAULT/.widgetarium/widgets/@default/metric-total-v2"
```

The record carries all eight derived props; the catalogue serves fourteen. The rule this cost is
written up in the project CLAUDE.md, "A widget change is not done until the vault has it".

**The sheet shipped is one frame.** v2 had no `widget.css` at all — the paint lives in `Main.css`, and
the publisher knows nothing of per-frame sheets. `widget.css` is that one frame merged, carrying a
`TODO:` that says so: the widest tile looks like the design, and the narrow rungs, the dark theme and
the bars view are unstyled until their frames are built and stage 3 merges them properly.

### Seen in Obsidian, and rejected

The first thing a person said on opening it was that there is no adaptive behaviour at all, and he was
right. Counted in the shipped sheet: **zero** `@container` rules. Nothing collapses, the period keeps
its full label at every width, the Add button keeps its label. Beside that: `.mt2-tip` carried one rule
— hide it — and no positioning, so hovering the chart dropped an unpositioned block above the card;
and `refusal`, `record-amount`, `add-label`, `records`, `record`, `list-count`, `undated`, `calendar`,
`note`, `sign` and `amount` had **no rule at all**, which means both windows were unpainted.

**The report before it was wrong by omission.** Saying "the widest tile looks like the design" was true
of one static card and hid that five of six frames and both windows did not exist. A frame that was
never built cannot be described by what the one built frame measures; the count of frames done is the
only honest headline.

**`widget.tsx` fails `file-size`**, 732 lines against a limit of 400. Not new and not this widget's
alone: `@default/metric-total` is 579 and `@task/kanban-board` is 2964, and all three report the same
error. The formatter also reflowed the file from the 399 lines its author measured to 731.

## All six frames, measured

| frame | paired | errors | not measured |
|---|---|---|---|
| Main | 20/20 | 5 | 3 |
| Bars | 29/29 | 11 | 7 |
| Medium | 24/24 | 7 | 7 |
| Compact | 19/19 | 9 | 5 |
| AddRecord | 25/25 | 24 | 2 |
| RecordList | 17/17 | 12 | 4 |

Medium and Compact re-measured here against the merged sheet, not taken on report: 7 and 9. The
instrument's own gate stands at 26 checks after the harness changes below.

### Two things the plan got wrong, found by measuring

**`useRoomForLabel` cannot own the period's label.** The cross-frame review named it the owner and
decisions §10b wrote it down. Measured: the Medium head is 412px holding 265px of content — 136px of
slack — and the hook only reports "no room" once the label is **clipped**. The artboard's `30d` is a
band decision, not a fit decision, so the hook could never fire for it. The label is two spans now,
picked by the same container query as every other rung, and the hook is gone from the widget. One
owner, not two.

**The Compact and RecordList artboards are templated**, and the shim never expanded `sc-for`, so the
design side was compared with literal `{{card.title}}` text and invalid `style="color: {{card.tone}}"`.
Every earlier Compact measurement in this document was partly that. Expansion is implemented; it
removed eight phantom errors and compares strictly more of the artboard.

### What the instrument was hiding from both sides

`--window-size` counts the browser's own chrome, so the viewport was **143px shorter** than asked and
`max-height: 70vh` clipped both dialogs. Every dialog measurement taken before this was wrong.
`Emulation.setDeviceMetricsOverride` fixes it. The page also needed the host's `box-sizing` reset — the
portal subtree was content-box — and `__READY__` now waits for animations to stop, because the dialog's
spring was being measured mid-flight at ×1.028 and produced 23 phantom errors.

### Left open, and each needs a person

- **The muted ink is ~60% of every remaining error.** `--text-muted` #707070 against the design's
  `color-mix(in srgb, var(--ink) 55%, var(--ground))` #858585, and `--text-faint` against its 36–38%
  sibling. Taken as the token everywhere, as Main did.
- **The calendar is one row taller than the artboard.** The kit fixes 42 cells at `src/kit.js:961` so
  the panel does not jump between months; the design draws 35. The Add window is 39px taller than its
  stage. Hiding the trailing row reintroduces exactly the jump the kit exists to prevent.
- **Two Compact claims are not falsifiable and were reported as such**: "Add loses its label" and "two
  plates". The button is a fixed 34px at that width either way, and the plates grid is already squashed
  by its content column, so plates three and four render at 0×0 while `plates` still measures 176×84.
  Medium does catch the plate rung.
- The shadows, the dialog cast and the under-300 rung stand as `open.md` records them.

## What is left

- `data-part` on the design artboards, once the skeleton fixes the names — pairing should be data,
  not hand-written selectors
- the implementation-side renderer, which stage 2 needs before stage 4 can run; it must set
  `window.__READY__` and collect `window.__err`, the same contract the artboard shim holds
- `tools/paint-test.mjs` still carries its own copy of the CDP driver. It cannot simply read
  `chrome-ask.mjs` yet: it also drives `Input.dispatchMouseEvent` for hover and reads `window.__err`
  through a path of its own. Moving it is a step of its own, not a side effect of this one.
- the sRGB gamma threshold is `0.04045` here and `0.03928` in `tools/ladder-test.mjs` and
  `tools/paint-test.mjs`. Both numbers are published — the first for sRGB, the second by WCAG — so
  neither file is wrong, but the repository now holds two definitions of one quantity.
- the two sides are drawn from separate data and nothing checks they depict the same state; the
  report should name the props each side drew with
- V1 stays untouched until V2 replaces it

## Done when

- every part of every built frame pairs and measures inside the thresholds, proved by breaking one
- the dot pattern keeps its step when the tile is widened — the defect V1 still carries
- a reviewer's finding names a file and a rule, and the agent that applies it never read this task
