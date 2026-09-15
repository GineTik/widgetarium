// The storage format and the derivation rule, checked without Obsidian.
import { buildMirror } from "./mirror.mjs";

buildMirror();

const { normalizeBoard, serializeBoard, placedIds, heldKey, keptRecords, mountRows, mountList, mountPatch, propConfig, rekeyed, uniqueName } = await import(
	"./.mjs-cache/model.mjs"
);
const { leavesOf, nodeAt } = await import("./.mjs-cache/tree.mjs");
const { BLOCK_FORMAT } = await import("./.mjs-cache/version.mjs");
const { storedRows } = await import("./.mjs-cache/gateway/props.mjs");

const THREE_REGIONS = (of) => ({
	dir: "row",
	of: [{ dir: "column", foldable: true, of: [] }, { dir: "column", keep: true, of }, { dir: "column", foldable: true, of: [] }],
});

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

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
	check("and it arrives as a record, like a mount", Object.keys(chosen.tiles[0].slots.properties).sort(), ["mounted", "mounts", "props", "settings", "slots", "widget"]);
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
		archivedColumns: { Marketing: ["Done"] },
		layouts: { 12: { places: [{ id: "card", x: 0, y: 0, w: 4, h: 2 }] } },
	};
	const owned = normalizeBoard(authored);
	check("a property list in the block is no longer a fact about the board", owned.properties, undefined);
	check("nor is a map of archived columns", owned.archivedColumns, undefined);

	const written = serializeBoard(owned);
	check("and neither key is written back", ["properties" in written, "archivedColumns" in written], [false, false]);
	check("what the block still carries round-trips byte-identical", JSON.stringify(serializeBoard(normalizeBoard(written))), JSON.stringify(written));
	check("and the board is still parsed", owned.tiles[0].id, "card");
}

// CONTEXT: the normaliser promises the same shape whichever format it was given
{
	const fromArray = normalizeBoard([{ id: "a", widget: "w", x: 0, y: 0, w: 3, h: 2 }]);
	check("a bare array is read as places and laid out", leavesOf(fromArray.layout).map((leaf) => leaf.id), ["a"]);
	check("a bare array gets a mode", fromArray.mode, "collapsed");
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
	check("the mount's own field wins over the setting it used to live in", mountList({ mounts: { holds: "a" }, settings: { holds: "b" } }, "holds", { was: "views" }), "a");
	check("the mount's new key wins", mountList({ mounts: { holds: "a", views: "b" } }, "holds", { was: "views" }), "a");
	check("its old key is read when the new one is absent", mountList({ mounts: { views: "b" } }, "holds", { was: "views" }), "b");
	check("a list still stored as a setting is read where it sits", mountList({ settings: { views: "b" } }, "holds", { was: "views" }), "b");
	check("and the manifest's default when neither is there", mountList({}, "holds", { was: "views", default: "d" }), "d");
	// CONTEXT: emptied deliberately is not the same as never set — `[]` must not fall back
	check("an emptied list stays empty", mountList({ mounts: { holds: [] } }, "holds", { was: "views", default: "d" }), []);

	const holder = { mounts: { holds: [{ name: "One", widget: "@x/a" }, { name: "Two", widget: "@x/b" }] }, mounted: { One: { widget: "@x/a" }, Two: { widget: "@x/b" } } };
	const shorter = mountPatch(holder, "holds", [{ name: "One", widget: "@x/a" }]);
	check("a row taken off the list takes its record with it", Object.keys(shorter.mounted), ["One"]);
	check("and the same holds where the window writes it", Object.keys(keptRecords(holder.mounted, [{ name: "One" }])), ["One"]);
	check("a record still on the widget-id key it arrived under is not swept away", Object.keys(keptRecords({ "@x/b": {} }, [{ name: "Two", was: "@x/b" }])), ["@x/b"]);
	check("and the row itself is gone from the list", shorter.mounts.holds.map((row) => row.name), ["One"]);
	const legacyHolder = { settings: { views: "@x/a" }, mounts: { views: [{ name: "One", widget: "@x/a" }] }, mounted: {} };
	const onNewKey = mountPatch(legacyHolder, "holds", [{ name: "One", widget: "@x/a" }], "views");
	check("the write moves the list onto the new key", Object.keys(onNewKey.mounts), ["holds"]);
	check("and leaves neither old key behind", [Object.keys(onNewKey.settings), "views" in onNewKey.mounts], [[], false]);

	const tuned = { settings: { days: 30, columns: "To Do, Doing" }, props: {} };
	const number = { kind: "value", type: "number", wasSetting: true };
	check("a prop that says it replaced a setting reads the one the note still carries", propConfig(tuned, "days", number), { from: "typed", value: 30 });
	check("a prop that never was one ignores a stray key of its own name", propConfig(tuned, "days", { kind: "value", type: "number" }), {});
	check("the prop written on the tile wins over the setting behind it", propConfig({ ...tuned, props: { days: { from: "typed", value: 7 } } }, "days", number), { from: "typed", value: 7 });
	const list = { kind: "collection", wasSetting: true, rowsFromText: "name" };
	check("the setting behind a prop is handed over as it was written", propConfig(tuned, "columns", list), { from: "typed", value: "To Do, Doing" });
	check("a comma list becomes rows under the field the prop names", storedRows("To Do, Doing", list).map((row) => row.value), [{ name: "To Do" }, { name: "Doing" }]);
	check("bare names in a stored list become rows too", storedRows(["To Do", { name: "Doing" }], list).map((row) => row.value), [{ name: "To Do" }, { name: "Doing" }]);
	check("and records are left as they were written", storedRows([{ name: "Done", archivedAt: "2026-09-01" }], list).map((row) => row.value), [{ name: "Done", archivedAt: "2026-09-01" }]);
	check("without that field text names nothing", storedRows("To Do, Doing", { kind: "collection", wasSetting: true }), []);

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
	const untouched = { v: BLOCK_FORMAT, tiles: [{ id: "g", widget: "@x/group", settings: { views: "@x/kanban" }, mounted: { "@x/kanban": { widget: "@x/kanban", settings: { a: 1 } } } }], layout: THREE_REGIONS([{ id: "g" }]) };
	check("an old-shape board round-trips byte-identical", JSON.stringify(serializeBoard(normalizeBoard(untouched))), JSON.stringify(untouched));

	const fresh = { v: BLOCK_FORMAT, tiles: [{ id: "g", widget: "@x/group", settings: { holds: [{ name: "Mine", widget: "@x/kanban" }] }, mounted: { Mine: { widget: "@x/kanban", settings: { a: 1 } } } }], layout: THREE_REGIONS([{ id: "g" }]) };
	check("and so does a new-shape one", JSON.stringify(serializeBoard(normalizeBoard(fresh))), JSON.stringify(fresh));
}


{
	console.log("\n— a board laid as a tree —");
	const tiles = [{ id: "a", widget: "w" }, { id: "b", widget: "w" }, { id: "c", widget: "w" }];

	const regioned = normalizeBoard({ tiles, layout: { left: [], main: [[{ id: "a", ratio: 3 }, { id: "b" }], [{ id: "c", height: 640 }]], right: [] } });
	check("the root is a row", [regioned.layout.dir, regioned.layout.of.length], ["row", 3]);
	check("the three regions arrive as columns", regioned.layout.of.map((box) => box.dir), ["column", "column", "column"]);
	check("the middle one is the one that must stand", regioned.layout.of.map((box) => box.keep === true), [false, true, false]);
	check("and the two beside it are the ones that fold", regioned.layout.of.map((box) => box.foldable === true), [true, false, true]);
	check("a row of two cells is a row box", nodeAt(regioned.layout, [1, 0]).dir, "row");
	check("and it keeps the ratios it was given", nodeAt(regioned.layout, [1, 0]).of, [{ id: "a", ratio: 3 }, { id: "b", ratio: 1 }]);
	check("a row of one cell is the cell itself", nodeAt(regioned.layout, [1, 1]), { id: "c", ratio: 1, height: 640 });
	check("every leaf knows its path", leavesOf(regioned.layout).map((leaf) => `${leaf.id}@${leaf.path.join("/")}`), ["a@1/0/0", "b@1/0/1", "c@1/1"]);

	const nested = { dir: "row", of: [{ id: "a", ratio: 2 }, { dir: "column", of: [{ id: "b" }, { id: "c", height: 200 }] }] };
	const deep = normalizeBoard({ tiles, layout: { dir: "row", of: [{ dir: "column", keep: true, of: [nested] }] } });
	check("a column inside a row is read", nodeAt(deep.layout, [0, 0, 1]).dir, "column");
	check("and its two cells are where they were put", leavesOf(deep.layout).map((leaf) => leaf.path.join("/")), ["0/0/0", "0/0/1/0", "0/0/1/1"]);
	check("the nested tree round-trips byte-identical", JSON.stringify(serializeBoard(normalizeBoard(serializeBoard(deep)))), JSON.stringify(serializeBoard(deep)));
	check("a ratio of one is not written down", serializeBoard(deep).layout.of[0].of[0].of[1].of[0], { id: "b" });
	check("a height is", serializeBoard(deep).layout.of[0].of[0].of[1].of[1], { id: "c", height: 200 });

	const grid = normalizeBoard({
		tiles,
		layouts: {
			12: { places: [{ id: "a", x: 0, y: 0, w: 4, h: 1 }] },
			20: { places: [{ id: "a", x: 0, y: 0, w: 6, h: 2 }, { id: "b", x: 6, y: 0, w: 14, h: 2 }, { id: "c", x: 0, y: 2, w: 20, h: 8 }] },
		},
	});
	check("a grid board is read as a tree", grid.layout.dir, "row");
	check("the widest authored width is the one taken", leavesOf(grid.layout).map((leaf) => leaf.id), ["a", "b", "c"]);
	check("places sharing a row become one row box", nodeAt(grid.layout, [1, 0]).of.map((cell) => cell.id), ["a", "b"]);
	check("a place's width becomes its ratio", nodeAt(grid.layout, [1, 0]).of.map((cell) => cell.ratio), [6, 14]);
	check("a place's height becomes pixels", nodeAt(grid.layout, [1, 1]).height, 8 * 62 - 8);
	check("and nothing of the grid is written back", "layouts" in serializeBoard(grid), false);

	const stray = normalizeBoard({ tiles, layouts: { 20: { places: [{ id: "a", x: 0, y: 0, w: 4, h: 2 }] } } });
	check("a tile the grid never placed still lands on the board", leavesOf(stray.layout).map((leaf) => leaf.id), ["a", "b", "c"]);

	const bare = normalizeBoard({ tiles: [] });
	check("a board with no layout at all is born with three regions", bare.layout.of.length, 3);
	check("an empty region is a region, not the absence of one", serializeBoard(bare).layout.of[0], { dir: "column", foldable: true, of: [] });

	const junk = normalizeBoard({ tiles, layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: "" }, 7, null, { of: [] }, { id: "a" }] }] } });
	check("a node that is neither a leaf nor a box is dropped", leavesOf(junk.layout).map((leaf) => leaf.id), ["a"]);
	check("and an undeclared box with nothing in it goes with it", nodeAt(junk.layout, [0]).of.length, 1);

	const lonely = normalizeBoard({ tiles, layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ dir: "row", ratio: 5, of: [{ id: "a" }] }] }] } });
	check("a box left holding one child collapses into it", nodeAt(lonely.layout, [0, 0]), { id: "a", ratio: 5 });

	const sized = normalizeBoard({ tiles, layout: { left: { width: 420, collapsed: true, rows: [["a"]] }, main: [["b"]] } });
	check("a sidebar keeps the width it was dragged to", nodeAt(sized.layout, [0]).width, 420);
	check("and the fold it was left in, under its old name", nodeAt(sized.layout, [0]).folded, true);
	check("a box that cannot fold is not read as folded", "folded" in nodeAt(sized.layout, [1]), false);
	check("the whole side box reaches the file", serializeBoard(sized).layout.of[0], { dir: "column", width: 420, foldable: true, folded: true, of: [{ id: "a" }] });
	check("a fold written as anything but true is no fold", "folded" in normalizeBoard({ tiles, layout: { left: { folded: "yes", rows: [["a"]] }, main: [] } }).layout.of[0], false);
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
