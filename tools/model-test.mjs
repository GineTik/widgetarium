// The storage format and the derivation rule, checked without Obsidian.
import { buildMirror } from "./mirror.mjs";

buildMirror();

const { normalizeBoard, serializeBoard, authoredColumns, sourceColumnsFor, layoutFor } = await import(
	"./.mjs-cache/model.mjs"
);

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const legacy = {
	tiles: [{ id: "a", widget: "w" }],
	layouts: { phone: [{ id: "a", x: 0, y: 0, w: 4, h: 6 }], tablet: [{ id: "a", x: 2, y: 0, w: 6, h: 6 }], desktop: [] },
};
const board = normalizeBoard(legacy);

check("named layouts migrate to their column counts", authoredColumns(board), [4, 12]);
check("an empty named layout does not become authored", board.layouts[20], undefined);
check("coordinates survive the migration", board.layouts[4], [{ id: "a", x: 0, y: 0, w: 4, h: 6 }]);
check("a bare array lands on 12", authoredColumns(normalizeBoard([{ id: "a", x: 0, y: 0, w: 3, h: 2 }])), [12]);

check("below the midpoint derives from the smaller", sourceColumnsFor(board, 6), 4);
check("above the midpoint derives from the larger", sourceColumnsFor(board, 9), 12);
check("a tie goes to the larger", sourceColumnsFor(board, 8), 12);
check("an authored count is its own source", sourceColumnsFor(board, 4), 4);

check("only authored counts are written", Object.keys(serializeBoard(board).layouts), ["4", "12"]);
check("an authored width reports itself authored", layoutFor(board, 4).isAuthored, true);
check("a derived width reports itself derived", layoutFor(board, 8).isAuthored, false);

// INVARIANT: a derived place always fits the column count it was derived for
const overflowing = [];
for (let columns = 3; columns <= 45; columns += 1) {
	for (const place of layoutFor(board, columns).places) {
		if (place.x + place.w > columns) overflowing.push(`${columns}:${place.id}`);
	}
}
check("no derived place overflows, 3 to 45 columns", overflowing, []);

const { measureGrid } = await import("./.mjs-cache/paths.mjs");

// The grid law, swept across every width the plugin can be given.
const TAP_TARGET_PX = 48;
const sweep = { backwards: [], underTap: [], deadMargin: 0, minCell: Infinity, maxCell: 0, biggestJump: 0, jumpAt: 0 };
for (let width = 301; width <= 3440; width += 1) {
	const here = measureGrid(width);
	const before = measureGrid(width - 1);
	if (here.columns < before.columns) sweep.backwards.push(width);
	if (here.cell < TAP_TARGET_PX) sweep.underTap.push(width);
	sweep.deadMargin = Math.max(sweep.deadMargin, width - 32 - here.boardWidth);
	sweep.minCell = Math.min(sweep.minCell, here.cell);
	sweep.maxCell = Math.max(sweep.maxCell, here.cell);
	const jump = Math.abs(here.cell - before.cell);
	if (jump > sweep.biggestJump) {
		sweep.biggestJump = jump;
		sweep.jumpAt = width;
	}
}

// INVARIANT: a wider board never has fewer columns. Held per class, the gutter stepped at
// the class edge and the board reflowed backwards as the window grew.
check("columns never decrease as the width grows", sweep.backwards, []);
// INVARIANT: the board is exactly as wide as it was given — no ceiling, no dead margin.
check("no dead margin at any width", Math.round(sweep.deadMargin), 0);
// INVARIANT: a 1x1 cell is a button and stays inside the finger.
check("the cell never falls under the tap target", sweep.underTap, []);
console.log(
	`--  cell spans ${sweep.minCell.toFixed(1)}..${sweep.maxCell.toFixed(1)}px, ` +
		`biggest step ${sweep.biggestJump.toFixed(1)}px at ${sweep.jumpAt}px wide`,
);

check("the phone lands on four columns", measureGrid(390).columns, 4);

// a hole above a tile is dead space nothing can use, so every place falls to the top
const gappy = normalizeBoard({
	tiles: [{ id: "a", widget: "w" }, { id: "b", widget: "w" }],
	layouts: { 12: { places: [{ id: "a", x: 0, y: 0, w: 4, h: 2 }, { id: "b", x: 0, y: 9, w: 4, h: 2 }] } },
});
check("a vertical hole closes", layoutFor(gappy, 12).places.map((place) => place.y), [0, 2]);

const sideBySide = normalizeBoard({
	tiles: [{ id: "a", widget: "w" }, { id: "b", widget: "w" }],
	layouts: { 12: { places: [{ id: "a", x: 0, y: 4, w: 4, h: 2 }, { id: "b", x: 6, y: 7, w: 4, h: 2 }] } },
});
check("neighbours in free columns both reach the top", layoutFor(sideBySide, 12).places.map((place) => place.y), [0, 0]);

// REGRESSION: gravity on the dragged tile too snapped it back to row 0, so a tile could
// not be dragged downwards at all
const { packPlaces } = await import("./.mjs-cache/layout.mjs");
const column = [{ id: "a", x: 0, y: 0, w: 4, h: 2 }, { id: "b", x: 0, y: 2, w: 4, h: 2 }];
const dropped = packPlaces(column.map((place) => (place.id === "a" ? { ...place, y: 4 } : place)), "a");
check("a dragged tile keeps the row it was dropped on", dropped.find((place) => place.id === "a").y, 4);
check("the tile it passed rises to the top", dropped.find((place) => place.id === "b").y, 0);
const afterRead = packPlaces(dropped);
check("the next read closes the hole and keeps the new order", afterRead.map((place) => `${place.id}${place.y}`), ["b0", "a2"]);
check("packing is idempotent", JSON.stringify(packPlaces(afterRead)), JSON.stringify(afterRead));

// a layout written under a class name instead of a column count is dropped on save; it
// must be loud, because silently losing an added widget is how that bug hid
const warned = [];
const realWarn = console.warn;
console.warn = (message) => warned.push(message);
const stray = { tiles: [], layouts: { 12: [], desktop: [{ id: "a", x: 0, y: 0, w: 1, h: 1 }] } };
serializeBoard(stray);
const onSave = warned.length;
warned.length = 0;
// the read path runs every render and must stay silent
layoutFor(stray, 9);
authoredColumns(stray);
const onRender = warned.length;
console.warn = realWarn;
check("saving a non-numeric layout key warns", onSave, 1);
check("rendering does not warn", onRender, 0);

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
