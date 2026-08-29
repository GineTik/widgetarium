// The storage format and the derivation rule, checked without Obsidian.
import { buildMirror } from "./mirror.mjs";

buildMirror();

const { normalizeBoard, serializeBoard, authoredColumns, sourceColumnsFor, layoutFor, placedIds } = await import(
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
const sweep = { backwards: [], underTap: [], deadMargin: 0, minCell: Infinity, maxCell: 0, biggestJump: 0, jumpAt: 0, worstScale: 0 };
for (let width = 301; width <= 3440; width += 1) {
	const here = measureGrid(width);
	const before = measureGrid(width - 1);
	if (here.columns < before.columns) sweep.backwards.push(width);
	if (here.cell < TAP_TARGET_PX) sweep.underTap.push(width);
	sweep.deadMargin = Math.max(sweep.deadMargin, width - 32 - here.boardWidth);
	sweep.worstScale = Math.max(sweep.worstScale, Math.abs(here.scale - 1));
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
// INVARIANT: the leftover is always less than one more column. The cell is fixed now, so it
// cannot absorb the remainder the way an elastic one did — but if the rag ever reached a whole
// cell plus its gutter, that is a column we should have fitted and did not.
const { GRID } = await import("./.mjs-cache/paths.mjs");
// INVARIANT, restored: the board is exactly as wide as it was given. The fixed cell would have
// left a rag of up to 77px; scaling it to the pane closes that without giving up one number.
check("no dead margin at any width", Math.round(sweep.deadMargin), 0);
// INVARIANT: the scale is a correction, not a redesign. If it ever had to move far, the cell
// itself would be the wrong number.
check("the scale stays within a fifth either way", sweep.worstScale < 0.2, true);
// INVARIANT: a 1x1 cell is a button and stays inside the finger.
check("the cell never falls under the tap target", sweep.underTap, []);
console.log(
	`--  cell ${GRID.cellPx}px by design, ${sweep.minCell.toFixed(0)}..${sweep.maxCell.toFixed(0)}px on screen ` +
		`(scale off by at most ${(sweep.worstScale * 100).toFixed(1)}%), no dead margin`,
);

// the column count follows the cell, so it is not a number to assert — what must hold is that
// a phone's cell is still something a finger can hit
const phone = measureGrid(390);
check("a phone's cell is still a tap target", phone.cell >= TAP_TARGET_PX, true);
console.log(`--  a 390px phone: ${phone.columns} columns, cell ${phone.cell.toFixed(1)}px, scale ${(phone.scale * 100).toFixed(1)}%`);

// A TILE STAYS WHERE IT WAS PUT. Rising to the first free row used to be automatic, so a board
// rearranged itself whenever anything above it moved. Closing a hole is now the Auto-fit
// button's job, and nobody else's.
const gappy = normalizeBoard({
	tiles: [{ id: "a", widget: "w" }, { id: "b", widget: "w" }],
	layouts: { 12: { places: [{ id: "a", x: 0, y: 0, w: 4, h: 2 }, { id: "b", x: 0, y: 9, w: 4, h: 2 }] } },
});
check("a vertical hole is left alone", layoutFor(gappy, 12).places.map((place) => place.y), [0, 9]);

const sideBySide = normalizeBoard({
	tiles: [{ id: "a", widget: "w" }, { id: "b", widget: "w" }],
	layouts: { 12: { places: [{ id: "a", x: 0, y: 4, w: 4, h: 2 }, { id: "b", x: 6, y: 7, w: 4, h: 2 }] } },
});
check("neighbours in free columns keep their rows", layoutFor(sideBySide, 12).places.map((place) => place.y), [4, 7]);

const { arrange } = await import("./.mjs-cache/layout.mjs");
const column = [{ id: "a", x: 0, y: 0, w: 4, h: 2 }, { id: "b", x: 0, y: 2, w: 4, h: 2 }];
const dropped = arrange(column.map((place) => (place.id === "a" ? { ...place, y: 4 } : place)), 12, { movedId: "a" });
check("a dragged tile keeps the row it was dropped on", dropped.find((place) => place.id === "a").y, 4);
check("the tile it passed does not move", dropped.find((place) => place.id === "b").y, 2);
const afterRead = arrange(dropped, 12, { reading: true });
check("the next read changes nothing", afterRead.map((place) => `${place.id}${place.y}`), ["a4", "b2"]);

// two tiles landing on the same cell is the ONE thing reading still fixes
const stacked = arrange([{ id: "a", x: 0, y: 0, w: 4, h: 2 }, { id: "b", x: 0, y: 1, w: 4, h: 2 }], 12, { reading: true });
check("an overlap in the file is pushed down, once", stacked.find((place) => place.id === "b").y, 2);

// AUTO-FIT is the deliberate act: everything grows into whatever is free
const roomy = arrange([{ id: "a", x: 0, y: 0, w: 4, h: 2 }, { id: "b", x: 6, y: 0, w: 4, h: 2 }], 12, { autoFit: true });
check("auto-fit leaves no free column", roomy.reduce((sum, place) => sum + place.w, 0), 12);
check("auto-fit does not move a tile off its row", roomy.map((place) => place.y), [0, 0]);
check("reading is idempotent", JSON.stringify(arrange(afterRead, 12, { reading: true })), JSON.stringify(afterRead));

// REGRESSION: a size was converted with the position formula, so the step from 3 to 4
// cells landed at 70% of the way instead of half
const { toCellSpan } = await import("./.mjs-cache/layout.mjs");
const CELL = 67.1;
const GAP = 16;
const spanOf = (cells) => cells * CELL + (cells - 1) * GAP;
const exact = [1, 2, 3, 4, 6, 9].map((cells) => toCellSpan(spanOf(cells), CELL, GAP));
check("an exact span reads back as itself", exact, [1, 2, 3, 4, 6, 9]);
const halfway = spanOf(3) + (CELL + GAP) / 2;
check("the step falls at the halfway point", toCellSpan(halfway + 1, CELL, GAP), 4);
check("just under halfway stays put", toCellSpan(halfway - 1, CELL, GAP), 3);
check("a size never reads as zero cells", toCellSpan(0, CELL, GAP), 1);

// THE LAW: the board never refuses a width. Derivation scales down as far as the board goes,
// and the widget answers with a compact design or a chip — a minimum was a wall the layout
// could not route around, and its only answer was to drop a tile to the next row.
const wide = normalizeBoard({
	tiles: [{ id: "hero", widget: "w" }],
	layouts: { 20: { places: [{ id: "hero", x: 0, y: 0, w: 9, h: 7 }] } },
});
const derivedWidths = [12, 8, 6, 4].map((columns) => layoutFor(wide, columns).places[0].w);
check("derivation scales all the way down", derivedWidths, [5, 4, 3, 2]);
check("and every step stays on the board", derivedWidths.every((w) => w >= 1), true);

const cramped = layoutFor(wide, 3, () => ({})).places[0];
check("a one-tile row still fills the board", [cramped.w, cramped.x + cramped.w <= 3], [1, true]);

// GROWTH: everything shares a shrink, but a folded tile is not handed columns back when the
// window widens — that is what folded means, and forgetting it sprang the sidebar open.
const folded = normalizeBoard({
	tiles: [{ id: "panel", widget: "w", folded: true }, { id: "board", widget: "w" }],
	layouts: { 10: { places: [{ id: "panel", x: 0, y: 0, w: 1, h: 8 }, { id: "board", x: 1, y: 0, w: 9, h: 8 }] } },
});
const declares = (id) => ({ growth: id === "panel" ? "keep" : "fill" });
const grown = layoutFor(folded, 20, declares).places;
check("a folded panel does not grow with the board", grown.find((place) => place.id === "panel").w, 1);
check("and the tile beside it takes the room", grown.find((place) => place.id === "board").w, 19);

// INVARIANT: no path may put a place outside the board — not derivation, not an authored
// layout, not a widget whose declared minimum is wider than the board itself
const crowded = normalizeBoard({
	tiles: [{ id: "big", widget: "w" }, { id: "small", widget: "w" }],
	layouts: { 20: { places: [{ id: "big", x: 0, y: 0, w: 14, h: 6 }, { id: "small", x: 14, y: 0, w: 6, h: 3 }] } },
});
const demanding = (id) => ({ defaultSize: id === "big" ? { w: 8, h: 4 } : { w: 3, h: 2 } });
const escaped = [];
for (let columns = 1; columns <= 45; columns += 1) {
	for (const place of layoutFor(crowded, columns, demanding).places) {
		if (place.x + place.w > columns || place.w < 1) escaped.push(`${columns}:${place.id}`);
	}
}
check("nothing escapes the board, 1 to 45 columns", escaped, []);

// the hidden-widget tray reads placedIds, which asks for the layout WITHOUT limits: the
// sizes differ there, so the ids had better not
const withLimits = new Set(layoutFor(crowded, 6, demanding).places.map((place) => place.id));
check("placedIds sees the same tiles with or without limits", [...placedIds(crowded, 6)].sort(), [...withLimits].sort());

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


// REGRESSION: settling and READING were made one operation, and the arrangement a person made
// was re-flowed on every render. Once a tile had been nudged the next render nudged it again,
// and the whole board walked itself into a single vertical column.
{
	const arranged = normalizeBoard({
		tiles: [
			{ id: "panel", widget: "w" },
			{ id: "tabs", widget: "w" },
			{ id: "board", widget: "w" },
		],
		layouts: {
			17: {
				places: [
					{ id: "panel", x: 0, y: 0, w: 2, h: 11 },
					{ id: "tabs", x: 2, y: 0, w: 15, h: 1 },
					{ id: "board", x: 2, y: 1, w: 15, h: 10 },
				],
			},
		},
	});

	const once = layoutFor(arranged, 17).places;
	const twice = layoutFor({ ...arranged, layouts: { 17: once } }, 17).places;
	check("reading an authored layout returns it unchanged", once, arranged.layouts[17]);
	check("and reading it again changes nothing either", twice, once);
	check("every tile stays on the row its author put it on", once.map((place) => place.y), [0, 0, 1]);
	check("and nothing was pushed into a column", new Set(once.map((place) => place.y)).size, 2);
}

// CONTEXT: surface.js resolveSlots reads tile.slots[name] — the person's pick of widget per slot
{
	const authored = {
		tiles: [
			{
				id: "popup",
				widget: "w",
				slots: { properties: "@other/properties" },
				mounted: { body: { settings: { zoom: 2 } } },
			},
		],
		layouts: { 12: { places: [{ id: "popup", x: 0, y: 0, w: 4, h: 2 }] } },
	};
	const chosen = normalizeBoard(authored);
	check("a slot choice survives normalising", chosen.tiles[0].slots, { properties: "@other/properties" });

	const written = serializeBoard(chosen);
	check("a slot choice reaches the file", written.tiles[0].slots, { properties: "@other/properties" });
	check("and the tile beside it keeps its mounted record", written.tiles[0].mounted, { body: { settings: { zoom: 2 } } });
	check("the round trip is byte-identical", JSON.stringify(serializeBoard(normalizeBoard(written))), JSON.stringify(written));

	const bare = serializeBoard(normalizeBoard({ tiles: [{ id: "a", widget: "w" }], layouts: {} }));
	check("a board that slots nothing gains no slots key", "slots" in bare.tiles[0], false);

	// CONTEXT: a hand-edited file can carry a null here, and one bad entry must not lose the board
	const damaged = normalizeBoard({ tiles: [{ id: "a", widget: "w", slots: { card: null, row: "@x/row" } }], layouts: {} });
	check("a null slot entry degrades alone", damaged.tiles[0].slots, { row: "@x/row" });
	check("and the board is still parsed", damaged.tiles[0].id, "a");
	check("a slots that is not an object is harmless", normalizeBoard({ tiles: [{ id: "a", widget: "w", slots: "card" }] }).tiles[0].slots, {});
}

// A MOUNTED WIDGET'S SLOT PICK MUST REACH THE FILE TOO. mountedTile now carries `slots`, so the
// earlier argument that a mounted child could not have one no longer holds — and a pick that the
// runtime honours but the file forgets is the same silent loss, one level down.
{
	const board = normalizeBoard({
		tiles: [{ id: "group", widget: "@x/group", mounted: { "@x/kanban": { slots: { card: "@other/card" } } } }],
		layouts: { 12: { places: [{ id: "group", x: 0, y: 0, w: 4, h: 2 }] } },
	});
	check("a mounted child's slot pick survives normalising", board.tiles[0].mounted["@x/kanban"].slots, { card: "@other/card" });
	check("and reaches the file", serializeBoard(board).tiles[0].mounted["@x/kanban"].slots, { card: "@other/card" });

	const empty = normalizeBoard({
		tiles: [{ id: "group", widget: "@x/group", mounted: { "@x/kanban": { settings: { a: 1 } } } }],
		layouts: { 12: { places: [{ id: "group", x: 0, y: 0, w: 4, h: 2 }] } },
	});
	check("a mounted child that slots nothing gains no slots key", "slots" in serializeBoard(empty).tiles[0].mounted["@x/kanban"], false);

	const twice = serializeBoard(normalizeBoard(serializeBoard(board)));
	check("and the round trip is byte-identical", JSON.stringify(twice), JSON.stringify(serializeBoard(board)));
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
