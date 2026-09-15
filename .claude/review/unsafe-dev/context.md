task: the board's layout became one recursive node tree, and the grid was deleted

Widgetarium draws widget tiles inside an Obsidian note. Until this change a board's `layout:` was
three named regions — `left`, `main`, `right` — each holding rows of cells, and beside it lived the
original grid, `layouts:`, a map of column counts to `{x, y, w, h}` places.

This change replaces both with one recursive node: a **leaf** is a tile (`{ id, ratio, height }`),
a **box** is `{ dir: "row" | "column", of: [...] }` and also carries `ratio`, `height`, `width`,
`keep`, `foldable`, `folded`, `scroll`. Boxes nest to any depth, which is the point — a column
inside a row could not be expressed before. `left`/`main`/`right` are gone as names: the middle box
carries `keep: true`, the two beside it `foldable: true`, and every consumer addresses a box by its
**path**, an array of indexes from the root. The grid is deleted outright (`src/layout.js`,
`src/chip.js`, the grid tile chrome); both older shapes are converted once inside `normalizeBoard`,
and writing only ever emits the tree, stamped `v: 2`.

Drag-and-drop now aims at a path: the deepest box or leaf under the pointer wins; along the parent's
own direction the tile becomes a sibling, across the grain it wraps the node it landed on in a new
box of that axis, which is how a person makes nesting by hand. Pruning removes empty boxes and
single-child boxes unless the box declares something, because a declared empty box is a region.

Out of scope for this change, by the user's own decision: the `swap` box that would replace
`@core/view-group`.

One adjacent defect was fixed because the tree exposed it: `delegatedWrites` in
`src/gateway/refs.ts` decided which write verbs exist from a snapshot of the target taken when the
ref proxy was built — on the first render, before the ref is published — so a widget writing through
a ref-picked row silently wrote nothing. `can()` now asks the live target, and a verb with nothing
behind it throws its reason instead of returning null.

Decision record: `docs/board-tree.md`. Laws: `CLAUDE.md`, the section "The grid is gone, and a board
is one recursive tree".

Verification already run: 52 suites green (`npm run test:<name>`), including `test:tree` (real
headless Chrome, five widths, carry/nest/grips/folds/drawer/catalogue/settings/removal),
`test:drawer`, `test:view`, `test:interact`, `test:tile`, `test:settings`, `test:window`,
`test:model`. `canvas`, `metric`, `paint` and `shots` are red for reasons proven pre-existing (the
`@default/metric-total` rebuild and an untracked shot gate). Twelve deliberate source mutations were
each shown to turn a check red and then restored md5-identical.
