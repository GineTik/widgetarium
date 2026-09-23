# Which control a settings row is made of

`BUILT` · 2026-09-01 · `src/settings-window.js`, `src/kit.js`, `styles.css`.
The laws behind the colours are in `docs/design-system.md`; this is which component to reach for.

## TL;DR

The panel is groups of rows. A row opens a popover, and everything that row owns lives **inside that
popover** — the mode switch, the explanation, the list, the editor. Nothing from the kit is
re-drawn by hand: a grey block is `SidebarGroup`, a row is `Row`, a list inside a popover is a
`SidebarGroup` of rows too.

## The panel

```
SidebarGroup  "Source · Tabs"        grey block, rounded, with the group's label above it
  Row (pressable)  Tabs   Typed here    the trigger; pressing it opens the popover
  hint under the block                  spec.hint, or how many widgets read this folder
```

One row per prop. The item list is **not** here — it belongs to the popover the row opens.

## The popover

```
Popover .wg-set-pop
  Segmented .wg-set-pop-kind      Folder | Typed here   — omitted when only one is possible
  <p> .wg-set-pop-note            what this mode means, one sentence
  then, by mode:
    vault    Field + PopoverItem rows      search, then the folders or notes that match
             for a typed value: the note's parts first — Content, Name, each property
    typed    SidebarGroup of Rows          the items, and a last row "Add item"
    a value  Field + Reset/Apply           one line of text or JSON
    an emoji GlyphPicker                   a search field over a grid of every drawing
    an icon  GlyphPicker                   the same, over the kit's glyphs and Lucide's
```

A `control: "emoji"` or `control: "icon"` prop has no field and no Reset/Apply: the grid IS the
editor, a press is the apply, and the popover shuts on it. The row it opens draws the drawing beside
its name, because a name alone is not what the person picked. The grid hands over 120 at a time and
grows as its end comes into view — 1883 icons drawn at once would take the frame with them.

Pressing an item replaces the popover's body with that item's editor — the same popover, no nesting:

```
  CodeArea .wg-kit-code           YAML, keys in accent, comments faint
  <p> .wg-set-pop-note            or .wg-set-pop-error when it does not parse
  .wg-set-pop-foot                Remove (or Back) · Apply, disabled while invalid
```

## The components

| surface                            | component                                    | class                                   |
| ---------------------------------- | -------------------------------------------- | --------------------------------------- |
| a group of rows anywhere           | `SidebarGroup`                               | `.wg-set-group`                         |
| a row that opens something         | `Row` + `RowLabel` + `RowValue`, `pressable` | `.wg-set-row`                           |
| a row that adds one                | the same, plus a `plus` icon                 | `.wg-set-row.is-add`                    |
| a row in a search list             | `PopoverItem`                                | `.wg-kit-pop-item`                      |
| a grid of drawings to pick from    | `GlyphPicker`                                | `.wg-set-glyphs`                        |
| an option with a sentence under it | `PopoverItem` with `sub`                     | `.wg-kit-pop-item.is-two`               |
| one line of text                   | `Field`                                      | `.wg-kit-field`                         |
| many lines with highlight          | `CodeArea`                                   | `.wg-kit-code`                          |
| two or three modes                 | `Segmented`                                  | `.wg-kit-seg`                           |
| a sentence under a block           | `<p>`                                        | `.wg-kit-side-hint`, `.wg-set-pop-note` |
| the same, gone wrong               | `<p>`                                        | `.wg-set-pop-error`                     |

`CodeArea` is a transparent textarea over a mirror that carries the spans — the same mechanism as
`MarkdownEditor`, sharing its `.wg-kit-md-*` metrics so the caret lands where the letter is drawn.

## The Design tab

```
SidebarGroup  "Surface"
  Row  Surface   Item        opens the five surfaces, each with the sentence it draws
  Row  Side      Start       only while the surface is a divider
  hint under the block
```

The five options are the kit's own `PopoverItem`s, standing in the popover body like every other list
in this window — no plate, because a plate inside the popover's own panel is a second ground. Each
takes `sub`, the kit's optional sentence under the label; a `disabled` item dims and its `sub` turns
`--text-error`, because a disabled option's sentence is the reason it is disabled.

The surface belongs to the **node** the tile stands on, not to the tile, so it is written through
`wornSurfaceAt` in `src/surface-laws.js` — the one place that decides and writes in a single call. A
surface the tree's own laws refuse (N, 5, N2) is drawn disabled, saying why in words rather than by
the law's letter — that letter is the agent's vocabulary and stays on the finding for the CLI. The
writer refuses it a second time, so no other caller may read the laws, decide and write anyway. The
laws that need the drawn board — P3 and the colour laws 6 to 8 — stay with `widgets.mjs surfaces`,
which advises rather than gates.

## The rules this window keeps

1. **A control the person cannot use is not drawn.** A switch with one option is no switch;
   `kindItems` returns one entry and `kindSwitch` returns null.
2. **Every mode says what it is.** One authored sentence under the switch, not a tooltip.
3. **A sentence is authored whole**, with `{field}` filled in — never built by concatenation
   (`npm run lint:lang`).
4. **No colour outside a token.** Keys use `--interactive-accent`, comments `--text-faint`,
   an error `--text-error`. Nothing in this window names a hex.
5. **The row is the trigger.** What is pressed is what is edited — no second pencil button.
6. **A refusal is said.** An invalid item shows the reason and disables `Apply`; it never applies
   half of it.

## Proved by

`npm run test:view` drives the real window in headless Chrome: opening a row, switching mode,
adding an item, every validation message, and what lands in the board file. `npm run test:paint`
holds the colours.
