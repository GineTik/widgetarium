// The storage format and the derivation rule, checked without Obsidian.
import { buildMirror } from "./mirror.mjs";

buildMirror();

const { normalizeBoard, serializeBoard, authoredColumns, sourceColumnsFor, layoutFor, placedIds, heldKey, mountRows, mountSetting, rekeyed, uniqueName } = await import(
	"./.mjs-cache/model.mjs"
);
const { BLOCK_FORMAT } = await import("./.mjs-cache/version.mjs");

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
	check("a slot choice survives normalising", chosen.tiles[0].slots.properties.widget, "@other/properties");
	check("and it arrives as a record, like a mount", Object.keys(chosen.tiles[0].slots.properties).sort(), ["mounted", "props", "settings", "slots", "widget"]);
	// CONTEXT: a mount written before the record shape names its widget nowhere but the key
	check("a mount written without a widget takes it off its key", chosen.tiles[0].mounted.body.widget, "body");

	const written = serializeBoard(chosen);
	check("a slot choice reaches the file, as a record", written.tiles[0].slots, { properties: { widget: "@other/properties" } });
	check("and the tile beside it keeps its mounted record", written.tiles[0].mounted, { body: { widget: "body", settings: { zoom: 2 } } });
	check("the round trip is byte-identical", JSON.stringify(serializeBoard(normalizeBoard(written))), JSON.stringify(written));

	const bare = serializeBoard(normalizeBoard({ tiles: [{ id: "a", widget: "w" }], layouts: {} }));
	check("a board that slots nothing gains no slots key", "slots" in bare.tiles[0], false);

	// CONTEXT: a hand-edited file can carry a null here, and one bad entry must not lose the board
	const damaged = normalizeBoard({ tiles: [{ id: "a", widget: "w", slots: { card: null, row: "@x/row" } }], layouts: {} });
	check("a null slot entry degrades alone", Object.keys(damaged.tiles[0].slots), ["row"]);
	check("and the board is still parsed", damaged.tiles[0].id, "a");
	check("a slots that is not an object is harmless", normalizeBoard({ tiles: [{ id: "a", widget: "w", slots: "card" }] }).tiles[0].slots, {});
}

// CONTEXT: a slot persisted as a bare widget id until it had more than the id to hold
{
	const old = { tiles: [{ id: "t", widget: "w", slots: { card: "@task/task-card" } }], layouts: { 12: { places: [{ id: "t", x: 0, y: 0, w: 4, h: 2 }] } } };
	const fresh = { tiles: [{ id: "t", widget: "w", slots: { card: { widget: "@task/task-card" } } }], layouts: { 12: { places: [{ id: "t", x: 0, y: 0, w: 4, h: 2 }] } } };
	check("the old shape reads", normalizeBoard(old).tiles[0].slots.card.widget, "@task/task-card");
	check("the new shape reads", normalizeBoard(fresh).tiles[0].slots.card.widget, "@task/task-card");
	check("and the two are the same board in memory", JSON.stringify(normalizeBoard(old)), JSON.stringify(normalizeBoard(fresh)));
	check("an edited file is written in the new shape only", serializeBoard(normalizeBoard(old)).tiles[0].slots, { card: { widget: "@task/task-card" } });

	// CONTEXT: one hand-edited file, one tile per shape — a half-migrated note is the normal case
	const mixed = normalizeBoard({
		tiles: [
			{ id: "old", widget: "w", slots: { card: "@task/task-card" } },
			{ id: "new", widget: "w", slots: { card: { widget: "@other/card", settings: { tone: "quiet" } } } },
		],
		layouts: { 12: { places: [{ id: "old", x: 0, y: 0, w: 4, h: 2 }, { id: "new", x: 4, y: 0, w: 4, h: 2 }] } },
	});
	check("both shapes read out of ONE file", [mixed.tiles[0].slots.card.widget, mixed.tiles[1].slots.card.widget], ["@task/task-card", "@other/card"]);
	check("and the new one keeps what only a record can hold", mixed.tiles[1].slots.card.settings, { tone: "quiet" });
	check("writing the mixed file emits one shape", serializeBoard(mixed).tiles.map((tile) => tile.slots.card.widget), ["@task/task-card", "@other/card"]);

	// CONTEXT: a slot is now the record a mount is, so it nests the same way
	const deep = normalizeBoard({
		tiles: [{ id: "t", widget: "w", slots: { card: { widget: "@a/one", slots: { badge: { widget: "@a/two", mounted: { "@a/three": { settings: { zoom: 3 } } } } } } } }],
		layouts: { 12: { places: [{ id: "t", x: 0, y: 0, w: 4, h: 2 }] } },
	});
	check("a slot inside a slot survives", deep.tiles[0].slots.card.slots.badge.widget, "@a/two");
	check("and a mount three levels down keeps its settings", deep.tiles[0].slots.card.slots.badge.mounted["@a/three"].settings, { zoom: 3 });
	const deepWritten = serializeBoard(deep);
	check("depth 3 reaches the file", deepWritten.tiles[0].slots.card.slots.badge.mounted["@a/three"], { widget: "@a/three", settings: { zoom: 3 } });
	check("and depth 3 round-trips byte-identical", JSON.stringify(serializeBoard(normalizeBoard(deepWritten))), JSON.stringify(deepWritten));

	// CONTEXT: a repeat is keyed id#2, and the widget is the key without it
	const repeated = normalizeBoard({ tiles: [{ id: "g", widget: "w", mounted: { "@x/k": { settings: { a: 1 } }, "@x/k#2": { settings: { a: 2 } } } }] });
	check("a repeated mount takes its widget off the key, without the #2", [repeated.tiles[0].mounted["@x/k"].widget, repeated.tiles[0].mounted["@x/k#2"].widget], ["@x/k", "@x/k"]);
}

// CONTEXT: the property list belongs to the BOARD — one vocabulary, every task shows every row
{
	const authored = {
		tiles: [{ id: "card", widget: "w", slots: { properties: "@other/properties" }, mounted: { body: { settings: { zoom: 2 } } } }],
		properties: ["Status", "Priority", "Progress", "Deadline", "Members"],
		layouts: { 12: { places: [{ id: "card", x: 0, y: 0, w: 4, h: 2 }] } },
	};
	const owned = normalizeBoard(authored);
	check("the board's property list survives normalising", owned.properties, ["Status", "Priority", "Progress", "Deadline", "Members"]);

	const written = serializeBoard(owned);
	// CONTEXT: the comparison is order-sensitive, and the filter draws its rows in this order
	check("the property list reaches the file, in order", written.properties, ["Status", "Priority", "Progress", "Deadline", "Members"]);
	check("and reopening the file keeps that order", normalizeBoard(written).properties, ["Status", "Priority", "Progress", "Deadline", "Members"]);
	// CONTEXT: VACUOUS until the two above are green — with no properties at either end it compares nothing
	check("properties and mounts round-trip byte-identical", JSON.stringify(serializeBoard(normalizeBoard(written))), JSON.stringify(written));

	// CONTEXT: VACUOUS until the list is written at all — nothing wrote the key before
	const bare = serializeBoard(normalizeBoard({ tiles: [{ id: "a", widget: "w" }], layouts: {} }));
	check("a board that defines no properties gains no properties key", "properties" in bare, false);
	check("but the list is still promised in memory", normalizeBoard({ tiles: [], layouts: {} }).properties, []);

	// CONTEXT: a hand-edited file can carry a null here, and one bad entry must not lose the board
	const damaged = normalizeBoard({
		tiles: [{ id: "a", widget: "w" }],
		properties: ["Status", null, 7, "", "   ", { name: "Deadline" }, ["Members"], "Client"],
	});
	check("a malformed property entry degrades alone", damaged.properties, ["Status", "Client"]);
	check("and the board is still parsed", damaged.tiles[0].id, "a");
	check("a properties that is not a list is harmless", normalizeBoard({ properties: "Status" }).properties, []);

	// CONTEXT: the name IS the identity, and the anchors ignore case
	const doubled = normalizeBoard({ properties: ["Deadline", "Members", "deadline", " Deadline ", "MEMBERS"] });
	check("a repeated name is one property, whatever its case", doubled.properties, ["Deadline", "Members"]);
	check("a padded name is trimmed", normalizeBoard({ properties: ["  Deadline  "] }).properties, ["Deadline"]);
}

// CONTEXT: the normaliser promises the same shape whichever format it was given
{
	const fromArray = normalizeBoard([{ id: "a", widget: "w", x: 0, y: 0, w: 3, h: 2 }]);
	check("a bare array still lands on 12", authoredColumns(fromArray), [12]);
	check("a bare array gets a mode", fromArray.mode, "collapsed");
	check("a bare array gets a property list", fromArray.properties, []);
}

// A MOUNTED WIDGET'S SLOT PICK MUST REACH THE FILE TOO. mountedTile now carries `slots`, so the
// earlier argument that a mounted child could not have one no longer holds — and a pick that the
// runtime honours but the file forgets is the same silent loss, one level down.
{
	const board = normalizeBoard({
		tiles: [{ id: "group", widget: "@x/group", mounted: { "@x/kanban": { slots: { card: "@other/card" } } } }],
		layouts: { 12: { places: [{ id: "group", x: 0, y: 0, w: 4, h: 2 }] } },
	});
	check("a mounted child's slot pick survives normalising", board.tiles[0].mounted["@x/kanban"].slots.card.widget, "@other/card");
	check("and reaches the file", serializeBoard(board).tiles[0].mounted["@x/kanban"].slots, { card: { widget: "@other/card" } });

	const empty = normalizeBoard({
		tiles: [{ id: "group", widget: "@x/group", mounted: { "@x/kanban": { settings: { a: 1 } } } }],
		layouts: { 12: { places: [{ id: "group", x: 0, y: 0, w: 4, h: 2 }] } },
	});
	check("a mounted child that slots nothing gains no slots key", "slots" in serializeBoard(empty).tiles[0].mounted["@x/kanban"], false);

	const twice = serializeBoard(normalizeBoard(serializeBoard(board)));
	check("and the round trip is byte-identical", JSON.stringify(twice), JSON.stringify(serializeBoard(board)));
}

// THE BOARD OWNS THE NAME. A mount key used to be the widget id, which made a view unrenameable,
// made two of one widget one duplicated tab, and let a widget with no `view` answer to its title.
{
	const named = (id) => ({ "@x/kanban": "Kanban", "@x/plain": undefined, "@x/titled": undefined }[id]);
	const titled = (id) => ({ "@x/kanban": "Kanban board", "@x/plain": undefined, "@x/titled": "A title" }[id]);
	const nameFor = (id) => named(id) ?? titled(id) ?? id;

	const old = mountRows("@x/kanban, @x/kanban", nameFor);
	check("the old comma list of ids still reads", old.map((row) => row.widget), ["@x/kanban", "@x/kanban"]);
	check("and two of one widget become two names, not one twice", old.map((row) => row.name), ["Kanban", "Kanban 2"]);
	check("each row remembers the widget-id key its record still sits under", old.map((row) => row.was), ["@x/kanban", "@x/kanban#2"]);

	const rows = mountRows([{ name: "Mine", widget: "@x/kanban" }, { name: "Theirs", widget: "@x/kanban" }], nameFor);
	check("a stored name wins over the widget's own declaration", rows.map((row) => row.name), ["Mine", "Theirs"]);

	// A DUPLICATE IS DISAMBIGUATED ON READ, so no write — by us or by hand — can shadow a record
	const clashing = mountRows([{ name: "Same", widget: "@x/kanban" }, { name: "Same", widget: "@x/titled" }], nameFor);
	check("two rows may never share a name, however the file came to say they do", clashing.map((row) => row.name), ["Same", "Same 2"]);

	check("a widget declaring no view falls back to its title", mountRows("@x/titled", nameFor)[0].name, "A title");
	check("and one with neither is still usable, named off its id", mountRows("@x/plain", nameFor)[0].name, "@x/plain");
	check("a blank name in the file is no name at all", mountRows([{ name: "   ", widget: "@x/titled" }], nameFor)[0].name, "A title");
	check("a row with neither a name nor a widget is no row", mountRows([{ name: "", widget: "" }, "@x/titled"], nameFor).length, 1);
	check("but a named row with no widget is a view waiting to be filled", mountRows([{ name: "Ghost", widget: "" }], nameFor)[0].name, "Ghost");
	check("and an archived row keeps everything it had", mountRows([{ name: "Away", widget: "@x/titled", hidden: true }], nameFor)[0].hidden, true);

	const taken = new Set(["View", "View 2"]);
	check("a free name is handed back untouched", uniqueName(new Set(), "View"), "View");
	check("a taken one climbs past every name already out", uniqueName(taken, "View"), "View 3");
	check("and claiming it takes it out of circulation", uniqueName(taken, "View"), "View 4");
}

// THE LAZY MIGRATION, BOTH HALVES. Reading takes the old key; writing emits only the new one.
{
	check("the setting's new key wins", mountSetting({ holds: "a", views: "b" }, "holds", { was: "views" }), "a");
	check("its old key is read when the new one is absent", mountSetting({ views: "b" }, "holds", { was: "views" }), "b");
	check("and the manifest's default when neither is there", mountSetting({}, "holds", { was: "views", default: "d" }), "d");
	// CONTEXT: emptied deliberately is not the same as never set — `[]` must not fall back
	check("an emptied list stays empty", mountSetting({ holds: [] }, "holds", { was: "views", default: "d" }), []);

	const legacy = { "@x/kanban": { widget: "@x/kanban", settings: { a: 1 } } };
	check("a record is read where it sits", heldKey(legacy, "Kanban", "@x/kanban"), "@x/kanban");
	check("and under its name once it has moved", heldKey({ Kanban: {} }, "Kanban", "@x/kanban"), "Kanban");
	check("a mount that never had a legacy key reads its name", heldKey({}, "Kanban", "@x/kanban"), "Kanban");

	const moved = rekeyed(legacy, "Kanban", "@x/kanban", { settings: { a: 2 } });
	check("writing moves the record onto the name", moved.Kanban, { widget: "@x/kanban", settings: { a: 2 } });
	check("and takes the widget-id key with it", "@x/kanban" in moved, false);
	const beside = rekeyed({ ...legacy, Other: { widget: "@x/other" } }, "Kanban", "@x/kanban", { settings: { a: 2 } });
	check("a sibling record is not touched by the move", beside.Other, { widget: "@x/other" });

	// AN UNEDITED NOTE MUST NOT MOVE. The record still keyed by a widget id round-trips as it is.
	const untouched = { v: BLOCK_FORMAT, tiles: [{ id: "g", widget: "@x/group", settings: { views: "@x/kanban" }, mounted: { "@x/kanban": { widget: "@x/kanban", settings: { a: 1 } } } }], layouts: { 12: { places: [{ id: "g", x: 0, y: 0, w: 4, h: 2 }] } } };
	check("an old-shape board round-trips byte-identical", JSON.stringify(serializeBoard(normalizeBoard(untouched))), JSON.stringify(untouched));

	const fresh = { v: BLOCK_FORMAT, tiles: [{ id: "g", widget: "@x/group", settings: { holds: [{ name: "Mine", widget: "@x/kanban" }] }, mounted: { Mine: { widget: "@x/kanban", settings: { a: 1 } } } }], layouts: { 12: { places: [{ id: "g", x: 0, y: 0, w: 4, h: 2 }] } } };
	check("and so does a new-shape one", JSON.stringify(serializeBoard(normalizeBoard(fresh))), JSON.stringify(fresh));
}

{
	console.log("\n— a board laid in rows —");
	const grid = { tiles: [{ id: "a", widget: "w" }], layouts: { 12: { places: [{ id: "a", x: 0, y: 0, w: 4, h: 2 }] } } };
	check("a board with no rows carries no layout at all", "layout" in normalizeBoard(grid), false);

	const rows = { tiles: [{ id: "a", widget: "w" }, { id: "b", widget: "w" }], layout: [[{ id: "a", ratio: 3 }, { id: "b" }], [{ id: "a", height: 640 }]], layouts: {} };
	const laid = normalizeBoard(rows);
	check("a cell keeps the ratio it was given", laid.layout.main.rows[0][0], { id: "a", ratio: 3 });
	check("a cell without one is worth the same as its neighbours", laid.layout.main.rows[0][1], { id: "b", ratio: 1 });
	check("a height survives", laid.layout.main.rows[1][0], { id: "a", ratio: 1, height: 640 });

	const shorthand = normalizeBoard({ tiles: [{ id: "a", widget: "w" }], layout: [["a"], [{ id: "" }]], layouts: {} });
	check("a bare name is a cell", shorthand.layout.main.rows, [[{ id: "a", ratio: 1 }]]);

	check("rows round-trip through the file", serializeBoard(laid).layout, laid.layout.main.rows);
	check("and an empty list of rows is no list", "layout" in normalizeBoard({ tiles: [], layout: [], layouts: {} }), false);

	const regioned = { tiles: [{ id: "a", widget: "w" }], layout: { left: [["a"]], main: [["a"]], right: [["a"]] }, layouts: {} };
	check("a layout may name three regions", Object.keys(normalizeBoard(regioned).layout), ["left", "main", "right"]);
	check("and they round-trip as they were named", Object.keys(serializeBoard(normalizeBoard(regioned)).layout), ["left", "main", "right"]);
	check("a sidebar without a main is no layout", "layout" in normalizeBoard({ tiles: [], layout: { left: [["a"]] }, layouts: {} }), false);
	check("and a board that names only main is written as a bare list", Array.isArray(serializeBoard(laid).layout), true);

	const sized = normalizeBoard({ tiles: [{ id: "a", widget: "w" }], layout: { main: [["a"]], left: { width: 420, rows: [["a"]] } }, layouts: {} });
	check("a sidebar keeps the width it was dragged to", sized.layout.left.width, 420);
	check("and writes it back beside its rows", serializeBoard(sized).layout.left, { width: 420, rows: [[{ id: "a", ratio: 1 }]] });
	check("a region with no width is written as a bare list of rows", serializeBoard(sized).layout.main, [[{ id: "a", ratio: 1 }]]);

	const shut = normalizeBoard({ tiles: [{ id: "a", widget: "w" }], layout: { main: [["a"]], left: { folded: true, rows: [["a"]] } }, layouts: {} });
	check("a sidebar remembers that it was folded", shut.layout.left.folded, true);
	check("and the fold survives the file", serializeBoard(shut).layout.left, { folded: true, rows: [[{ id: "a", ratio: 1 }]] });
	check("an open one says nothing about folding", "folded" in shut.layout.main, false);
	check("and nothing about it reaches the file", serializeBoard(shut).layout.main, [[{ id: "a", ratio: 1 }]]);

	const shutMain = normalizeBoard({ tiles: [{ id: "a", widget: "w" }], layout: { main: { folded: true, rows: [["a"]] }, left: [["a"]] }, layouts: {} });
	check("the main cannot be folded — a board with no main is no board", "folded" in shutMain.layout.main, false);
	check("and asking for it is not written down either", serializeBoard(shutMain).layout.main, [[{ id: "a", ratio: 1 }]]);
	check("a fold written as anything but true is not a fold", "folded" in normalizeBoard({ tiles: [], layout: { main: [["a"]], left: { folded: "yes", rows: [["a"]] } }, layouts: {} }).layout.left, false);
	check("a note written under the old name still opens folded", normalizeBoard({ tiles: [], layout: { main: [["a"]], left: { collapsed: true, rows: [["a"]] } }, layouts: {} }).layout.left.folded, true);
	check("and the next write spells it the new way", serializeBoard(normalizeBoard({ tiles: [], layout: { main: [["a"]], left: { collapsed: true, rows: [["a"]] } }, layouts: {} })).layout.left, { folded: true, rows: [[{ id: "a", ratio: 1 }]] });
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
