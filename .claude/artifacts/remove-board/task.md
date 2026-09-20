# Task — the board bus dies, a board becomes a record

Source: published artifact `task-remove-board.md`
(https://claude.ai/code/artifact/0f5b3ca6-ee74-4a18-879c-471df5c2c724), read at the start of the
session and followed step by step. This file is the on-disk copy of what was executed.

## The defect

`selectionReader` already found the row a selection named and threw it away, returning one field of
it. The kanban then looked that row up again in its own code, joining **four gateways plus the host
bus** to answer "which columns does this board have". Two owners for "the columns of this board",
three for "which are archived".

## Target

One prop: `board`, a `ValueGateway` over the row the selection names.

```json
"board": { "kind": "value", "picks": "selection", "of": "boards",
           "verbs": { "get": "required", "update": "optional" } }
```

Archived is a field of the column (`archivedAt`), not a second list and not a map keyed by board
name on the block.

## The eight steps, and what landed

| #   | step                                                                                           | state                                           |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | `picks` resolves to the row, not a field of it                                                 | done — `pickedGateway` in `src/gateway/refs.ts` |
| 2   | `archivedAt` on the column; reading still accepts the old second list                          | done — `columnsOf` in `widgets/@task/lib.js`    |
| 3   | `board` as a prop in kanban; `columns`/`archivedColumns`/`readBoardRecord`/`boardWriter` go    | done                                            |
| 4   | `@task/archived-columns` reads `board.columns`                                                 | done                                            |
| 5   | `properties` becomes a field of the board; filter-panel loses the `board?.properties` fallback | done                                            |
| 6   | `{holder: true}` becomes the `foldIntoGroup` command                                           | done                                            |
| 7   | `board` and `configureBoard` deleted, with the plumbing behind them                            | done                                            |
| 8   | `properties`/`archivedColumns` out of `normalizeBoard`/`serializeBoard`                        | done                                            |

## Not done, and why

The map `archivedColumns: {"<board>": [...]}` and `properties` in the **board block** are no longer
read. Carrying them into board records is not possible: a tile holds one board, the map held
several, and which one is meant is unknowable at read time. The artifact called this "the only real
data migration"; it was not made. The keys survive in the file until the block is rewritten.

## Beyond the artifact

- `wiredTiles` now recurses into mounted tiles — without it a widget inside a view group could not
  point at anything by ref.
- The test host in `interact-test` persists frontmatter and announces writes; before that a write
  into a note was invisible to the UI, which the old tile-only model had hidden.
- The fixture gained `Orbitask/Boards` (three notes) and `Orbitask/DialogBoards`.

## Verification

Falsified with restore and an md5 check each time: `picks` returning the row, single normalization,
the write landing on the picked row, the legacy `archivedColumns` read, `foldIntoGroup` reaching a
tile, and the single-writer rule. Scan and scope notes in `violations.md` / `violations-after.md`.

Green everywhere except two failures that predate this work: `test:month` (2 checks, red on a clean
`git stash` too) and `test:interact` (`plugin.foldableRegions`, removed from `src/main.js` by
uncommitted work that is not part of this task).

## Aftermath

The vault symlinks `widgets/` into the repo but copies `main.js`, so Obsidian ran new widgets on the
engine installed on 9 Sep and drew a blank board. Fixed by `npm run install-vault`; recorded in
memory as `widgetarium-vault-symlink-trap`.

Follow-up, found in the user's own vault

The board drew four columns (`To Do, Doing, Test, Done`) while the tab strip showed `Untitled 1`.
`Orbitask/Boards/Test.md` carries those columns and an `archivedAt`; it sorts first, and
fallback-to-first took it regardless. The strip hides archived tabs, so the strip and the board
disagreed about which board was open.

Fixed in `src/gateway/refs.ts` - `firstStandingRow` skips any row carrying `archivedAt`, and both
`selectionReader` and `rowPicker` use it, so "first" means one thing in both places. Covered by two
checks in `tools/engine-test.mjs`; restoring `rows[0]` turns both red (verified, md5-restored).

The columns model itself stays as it is: the user has taken it into a separate task, because
grouping by a field and authored columns are two answers to one question.
