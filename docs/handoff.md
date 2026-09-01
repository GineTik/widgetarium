# Handoff — what is done and what is left

`HANDOFF` · 2026-09-01

Repo: `/Users/denissevcuk/Projects/Obsidian Plugins/widgetarium`. Read `CLAUDE.md` first.

**State right now:** `npm run build`, all 36 gates and `lint:lang` are green, and `main.js` is
rebuilt from the current sources. Two gates are new: `test:identity` (`tools/record-id-test.mjs`) and
`test:strip` (`tools/view-strip-test.mjs`).

> **`npm run build` is eight gates and then esbuild.** A failing gate makes `build.mjs` exit before
> esbuild ever runs, so `main.js` is left exactly as it was and the log carries no word that reads
> like a failure. A widget importing a name the stale bundle does not export crashes in Obsidian as
> `Cannot read properties of undefined (reading 'call')`, because sucrase compiles an imported call
> to `_widgetarium.name.call(void 0, ...)`. **Check that `main.js` moved, not that the log looks
> clean.** This is exactly how three new classes with no CSS rule shipped a bundle three hours old.

## Task 1 — the boards work is falsified

`tools/board-record-test.mjs` holds **52 checks**. Every one of them was broken on purpose, went red,
and was restored by a targeted edit verified by md5. Thirty-four mutations, run through
`npm run test:record`. The nine laws and the mutation that proves each:

| # | law | mutation that turns it red |
|---|---|---|
| 1 | adding a column on A does not add it to B | the writer sends columns to the shared setting (`boardWriter`); the reader prefers the fallback over the record; `isRecordOf` answers for the neighbour |
| 2 | archiving on A leaves B untouched | `readBoardRecord` takes `archivedColumns` from the fallback |
| 3 | order is per board and survives a switch | the record's columns are sorted on read |
| 4 | with no board files the old string still drives | the fallback columns are dropped; the board returns null with no record |
| 5 | the move writes one file per board | `boardsToCreate` slices the list |
| 6 | it never overwrites a board on file | the `taken` filter is removed |
| 7 | dismissing the confirmation creates nothing | the dialog's `onOpenChange` runs the move; the press runs it without asking |
| 8 | after the move, columns, order and archived come from the record | the fallback wins over the record |
| 9 | the name-keyed map still reads, on the right board | `archivedColumnsOn` returns nothing; `archivedColumnsFor` hands every board the whole map |

Three checks were **added** because the law had none: dismissing the question, the record as the
source after the move, and a column archived by the old map (see Task 6).

**Two checks were unfalsifiable and are gone.** `and neither took the other's` compared a substring,
so `archivedColumns: "Doing, Done"` contained neither name and the check passed for any mixture — it
now compares the whole value. `the board already on file was left exactly as it was` read the props of
the first file at a path, which a second create can never change — it now asserts what was written.

**The two inline confirms at `widgets/@task/kanban-board/widget.jsx` ~340 and ~388 are not
confirmations.** They are in-place name entry: an autofocused field, Enter and Escape, a Cancel/Add
pair, drawn inside the column plate and at the end of the strip. `ConfirmDialog` (`src/dialog.js:323`)
carries a title, a description and two buttons, is modal, and hands back no value. The shared dialog
cannot express them, so they stay — the same rule `EditableTabs` already follows, where a rename is
edited where it is read and only the delete goes to a dialog. The `.ok-confirm` class is the
orbitask prefix on a submit button, not a confirmation.

## Task 2 — record identity, built

`src/record-id.js` is the one owner of the id: where it sits, how it reads, when it is minted, and
which of two records claiming one id keeps it. Proof: `npm run test:identity`, **30 checks, all
falsified by 20 mutations**.

- stored under `widgetarium.wgId`; the flat `wgId` is still read, nothing rewrites a vault
- exposed as `record.id` by the gateway (`src/host.js`, `toRecord`) — the storage key never leaves
  that line
- minted on `slot.create` only. Drawing a board writes nothing, proved on a rendered board
- duplicates are detected on **read** and reported; the record whose **path sorts first** keeps the
  id; the others are re-minted by the next write that reaches them, or by the **Repair duplicate
  ids** press on the kanban
- **task → board** resolves id first, name second: the strip publishes `<key>Refs` — the id and the
  name of the selection — and `resolveFilter` (`src/surface.js`) turns the clause into `in [id, name]`,
  so a note that still stores the name goes on matching
- **the strip's selection** is the board's id once the board has one; `activeTab` holds the same
- renaming a board is **one write to one file** plus the notes that still name it. A task filed by id
  is never opened. New tasks are filed by id, because `addTask` stores the selection

## Task 3 — the tab strip inside the view group, built

`src/tab-rows.js` is the one law: `add`, `rename`, `archive`, `restore`, `delete` written **once** over
rows. A storage supplies `read()` and `write(rows, selected)` and nothing else. Three of them:

- **setting** — `@core/editable-tabs` over its own `tabs` / `archived` settings
- **records** — the same widget when its `records` folder holds notes; a name no record answers to
  stays loose in the setting until the move files it
- **holds** — `@core/view-group` over its mount rows, through `configureMounts` (`src/surface.js`),
  which writes the rows and rekeys the records they key in one patch (`mountPatch`, `src/model.js`)

Proof: `npm run test:strip`, **31 checks**, falsified by 22 mutations.

- renaming a tab renames the view, and the view's own settings move with it
- adding a tab makes an **empty** view; its placeholder press opens the catalogue through
  `pickWidget` (`src/catalogue-dialog.js`) and the chosen widget fills the tab, keeping the name
- archiving hides the tab; the row, the widget and its settings stay in the note, and Restore brings
  them back untouched
- the group's **Design** tab carries `Show the tab row` — a manifest setting flagged `design: true`,
  rendered by `designGroups` (`src/settings-window.js`)
- **the group yields.** Two writers of one key is a refusal, so the strip hides itself when another
  widget already claims `view` (`context.claimedByAnother`). A board with a switcher behaves exactly
  as before

## Task 4 — the substitution: both cheap checks came back positive

Run before any code was written, both went red, both are now fixed and falsified
(`npm run test:substitution`).

1. **`querySelectorAll("p, li")` finds nothing when the element handed in IS the paragraph.** A bare
   `<p>` was substituted 0 times. `blocksIn` (`src/inline-render.js`) now includes the element itself,
   which is what Dataview's `findAllSelf` is for.
2. **`replaceWith` on the element the processor was handed.** When the whole block matched, the node
   reading view owns was replaced out of the note. It is now filled with `replaceChildren` when the
   block is that element, and only a descendant is ever replaced.

**Still unbuilt: the Live Preview pipeline.** `registerMarkdownPostProcessor` is reading mode only;
Live Preview is CodeMirror 6 and needs an editor extension with a `Decoration.replace` widget. Sources
in `docs/research/post-processors-and-live-preview.md`. The owner's `widgetarium:sub` log has still not
been read — the two checks above were done without it, and they are enough to say the reading-mode
half was broken in two places. Whether the vault's failure is those two or the missing CM6 pipeline
cannot be settled from here.

## Task 5 — both decisions taken

- **The button edge follows the fill.** The owner's rule is that a grey control has no border, and the
  hover fill is grey. `styles.css` now clears `--wg-kit-control-edge` on `:hover`. Proved in
  `test:paint` under a real pointer — CDP `Input.dispatchMouseEvent`, because `:hover` cannot be set
  from script — in both themes, with the control beside it keeping its own rim as the control.
- **`test:render` stays removed.** The owner's decision.

## Task 6 — the debts

Cleared:

- **five dead `.wg-set-list` rules** removed from `styles.css`. `test:settings` now asserts on the
  drawn window that nothing emits the class, and that the rows it would have styled are drawn anyway
- **`GLYPHS.text`** removed from `src/kit.js` — no consumer, verified by grep
- **`tools/ideal-test.mjs`** compared `String(a) === String(b)`, which calls `"1"` equal to `1`; it is
  strict now and the gate is still clean. `tools/_kit-baseline.mjs` had the same helper and no caller
  at all — tightened, not deleted, because it is a hand-run tool
- **`tools/settings-test.mjs` was already repaired.** Its `same()` is `Object.is` first, so
  `check("1", 1)` fails. The claim that the type-blind case survived is stale — the same seven
  harnesses (`blur`, `dialog-fit`, `fill`, `kit`, `ladder`, `settings`, `window`) all carry the strict
  version
- **`window.__err` in `tools/paint-test.mjs` was not inert, it was broken.** The error path called a
  `send` that did not exist, so any page throw crashed the harness with `send is not defined` instead
  of reporting the cause. `ask` now owns a real `send`, and `__err` is what reports a page throw
- **archived columns, the narrow limit is gone.** A column the old map archived is named nowhere else,
  so nothing authored it and restoring it lost the column. The authored list is now the record's
  columns plus what is archived, and restoring authors the name in the same write. Two checks in
  `test:record`, both falsified

Measured, not fixed:

- **the three flaky gates did not reproduce.** `test:dialog`, `test:view` and `test:drag` each ran 5/5
  green alone, and the full suite is green. What does break them is running two harnesses **at once**:
  `buildMirror` (`tools/mirror.mjs:9`) wipes and rebuilds the shared `tools/.mjs-cache`, so a second
  process deletes the first one's modules mid-import. `npm test` chains with `&&`, so that is not how
  they run. No guard was added for a failure that could not be measured

Named, still open:

- **the group has no way to take in an existing tile.** `Add widget` fills an empty view from the
  catalogue, and the switcher's `Add a view group` absorbs the tiles whose manifest declares a `view`
  name. An arbitrary tile already on the board still cannot be moved into a group that exists
- **`src/substitution-dialog.js:121`** builds its preview with the rule forced to
  `draft: false, enabled: true`. The dialog draws a working substitution for a rule that is a draft or
  switched off — the preview is not evidence that a rule is active
- **the `.wg-set-two` TODO** in `styles.css`: routing `src/settings-window.js` through `SidebarRow`
  would remove the last of that block

## How to work here

- **Do not read `src/surface.js`, `src/model.js`, `src/kit.js`, `styles.css`, `src/settings-window.js`
  or `widgets/@task/kanban-board/widget.jsx` whole.** `grep -n` to locate, then narrow ranged reads.
- Every edit targeted and uniqueness-asserted; refuse to mutate on an ambiguous marker. A restore
  whose marker is a bare newline matches three thousand times — assert the count before writing.
- **Never restore a shared file from a whole-file snapshot.**
- **`/Users/denissevcuk/Documents/Obsidian/Personal/Personal/` is the owner's vault and is off
  limits.** Prove everything on fixtures: `tools/fixture-boards`, `tools/fixture-records`.
- Do not commit. Do not touch git branches.
- **The acceptance rule:** a check that cannot be broken on purpose proves nothing. Mutate, confirm
  red, restore with a targeted edit, verify by md5, report the table. An unfalsifiable check is
  deleted, not shipped.
- `npm run test:paint` drives real headless Chrome and reads resolved values; the jsdom suites resolve
  no cascade, so a CSS claim proved only there is not proved.
- Every class in a widget's markup needs a rule in that widget's own sheet, or `check-classes` stops
  the build. The gates run before esbuild, so a missed rule is a bundle that never got written.
