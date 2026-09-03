# Pointing one widget at another is typed, not hunted for

`TASK` · 2026-09-02 · repo: widgetarium · `BUILT`

## TL;DR

The value picker listed every box on the board as a flat row with its live value beside it, which
read as noise the moment a board held more than a few widgets. It is now an autocomplete over
`{{tile.field}}` — the widgets first, that widget's fields after the dot. What lands in the note is
still `{ ref }`.

## What was wrong

Eight rows of `Widget · Field` with a second column of live values — `nothing yet`,
`4dfab3d9-9fab-41…`, `name`, `board`, `Kanban`. Two columns of unrelated text per row, one of them a
raw id. A person opening it cannot tell what is being asked of them.

## What it is now

| the field holds | the list below offers |
|---|---|
| nothing | the widgets |
| `{{fil` | the widgets whose id or title matches |
| `{{filter.` | that widget's fields |
| `{{filter.open` | its fields that match |
| `{{filter.openByDefault}}` | the field it names, and **Use it** is live |
| `{{filter1.something}}` | nothing to point at, so **Use it** is refused |
| `Widgetarium` | plain text, and **Use it** is live |

Pressing a widget writes `{{filter.}}`; pressing a field completes it. The field is painted in the
accent colour while it points at something and in the error colour while it does not.

## Three decisions, taken rather than asked twice

1. **The braces are how a reference is typed; the note still carries `{ ref }`.** A board written
   before this reads unchanged, and there is one stored format rather than two.
2. **The name in the braces is the tile id** — what tells two copies of one widget apart, and what
   `<tileId>/<propName>` already is.
3. **A whole field is one reference.** `Text {{filter.x}}` is plain text. Substitution inside a
   string is a template engine with its own rules for how a condition then compares — a different
   thing.

## Built

- `src/ref-draft.js` — `referenceIn`, `referenceText`, `boxNamed`, `widgetsOffering`,
  `matchesNeedle`. Its own module: pure string work that does not belong to a window, and inside
  `settings-window.js` it dragged React into every test of it.
- `src/settings-window.js` — the value column and its hint gone (`holdingSaid` and `HOLDS_NOTHING`
  died with them), `completionRows` in place of the flat list, the reference seeded back into the
  field when an existing condition is reopened.
- `styles.css` — air before `From another widget`, the two reference colours, and the row fix below.
- `tools/reference-test.mjs` + `npm run test:reference` — 16 checks.
- `tools/view-page.jsx`, `tools/view-test.mjs` — the reader read only rows that had a value column,
  so it saw nothing once the column went; the walkthrough now presses the widget, then its field.

## The label that vanished

`.wg-kit-row-value` was `flex: none` and never shrank, while `.wg-kit-row-label` had `min-width: 0`
and shrank to nothing — so a long value ate the word "Value" whole, which is what the third row of
the condition editor showed. The value shrinks and clips now; the label survives.

Proved in real Chrome (`npm run test:paint`), because jsdom lays nothing out and a CSS claim proved
only there is not proved. Three checks, falsified by restoring `flex: none` — RED in both themes.

Two mistakes made and caught on the way: taking `flex-grow` off the label stopped the value sitting
hard right (`test:kit` caught it), and a nested `:is()` slipped my rule past the scope gate
(`test:substitution` caught it).

## State

`npm test` green end to end, exit 0. `npm run build` green.

## Left

- The reviewers have not been run over this change.
- The plugin must be installed into a vault (`npm run install-vault`) before any of it is visible —
  the bundle in the vault was an hour stale, which is why the change looked absent.
