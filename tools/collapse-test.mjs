// A panel folds to a strip and comes back to the width it left — the width THIS screen had
// it at, because layouts are per column count and a phone must not decide what a desktop
// reopens to.
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { normalizeBoard, layoutFor, serializeBoard } = await import("./.mjs-cache/model.mjs");
const { arrange } = await import("./.mjs-cache/layout.mjs");

let failed = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};

const MANIFESTS = { panel: { minSize: { w: 4, h: 9 }, maxSize: { w: 6, h: 14 }, collapsedSize: { w: 1 } } };

// the same rule the board runs, kept in one place so the test cannot drift from it
const limitsOf = (target) => {
	const id = typeof target === "string" ? target : target.id;
	const manifest = MANIFESTS[id];
	const collapsed = typeof target !== "string" && target.wasW;
	return {
		minimum: collapsed ? (manifest?.collapsedSize ?? { w: 1, h: manifest?.minSize?.h ?? 1 }) : manifest?.minSize,
		maximum: collapsed ? { w: manifest?.collapsedSize?.w ?? 1, h: manifest?.maxSize?.h } : manifest?.maxSize,
	};
};

const collapse = (places, id) =>
	places.map((place) => (place.id === id && !place.wasW ? { ...place, w: 1, wasW: place.w } : place));

const expand = (places, id) =>
	places.map((place) => {
		if (place.id !== id || !place.wasW) return place;
		const { wasW, ...rest } = place;
		return { ...rest, w: wasW };
	});

let board = normalizeBoard({
	tiles: [{ id: "panel", widget: "@orbitask/kanban-board" }],
	layouts: { 20: { places: [{ id: "panel", x: 0, y: 0, w: 5, h: 9 }] } },
});

const at = (columns) => layoutFor(board, columns, limitsOf).places.find((place) => place.id === "panel");
check("the panel starts at the width it was laid out", at(20).w, 5);

board = { ...board, layouts: { ...board.layouts, 20: collapse(board.layouts[20], "panel") } };
check("collapsing takes it to one column", at(20).w, 1);
check("even though its own minimum is four", limitsOf({ id: "panel" }).minimum.w, 4);
check("and it knows what to go back to", at(20).wasW, 5);

// REGRESSION: the minimum used to clamp a collapsed tile straight back up to four
check("nothing widens it while it is collapsed", layoutFor(board, 20, limitsOf).places[0].w, 1);

board = { ...board, layouts: { ...board.layouts, 20: expand(board.layouts[20], "panel") } };
check("expanding returns the width it had", at(20).w, 5);
check("and stops remembering", at(20).wasW, undefined);

// the remembered width is per screen, which is the whole reason it sits on the place
board = normalizeBoard({
	tiles: [{ id: "panel", widget: "@orbitask/kanban-board" }],
	layouts: {
		20: { places: [{ id: "panel", x: 0, y: 0, w: 5, h: 9 }] },
		8: { places: [{ id: "panel", x: 0, y: 0, w: 4, h: 9 }] },
	},
});
board = { ...board, layouts: { ...board.layouts, 20: collapse(board.layouts[20], "panel"), 8: collapse(board.layouts[8], "panel") } };
board = { ...board, layouts: { ...board.layouts, 20: expand(board.layouts[20], "panel"), 8: expand(board.layouts[8], "panel") } };
check("the wide screen reopens to five", at(20).w, 5);
check("and the narrow one to four", at(8).w, 4);

// folded survives the file — as ONE fact on the tile, not one per layout
const foldedBoard = normalizeBoard({
	tiles: [{ id: "panel", widget: "@orbitask/kanban-board", folded: true }],
	layouts: { 20: { places: [{ id: "panel", x: 0, y: 0, w: 1, h: 9 }] } },
});
check("folded is written on the tile", serializeBoard(foldedBoard).tiles[0].folded, true);
check("and an unfolded tile carries no such field", "folded" in serializeBoard(board).tiles[0], false);


// AUTOFILL: the freed columns read as a wider screen, and the row grows into them in
// proportion — never greedily, never all to whoever is first.
{
	const before = { id: "panel", x: 0, y: 0, w: 4, h: 9 };
	const after = { id: "panel", x: 0, y: 0, w: 1, h: 9, wasW: 4 };
	// exactly how the board calls it: the folded tile is already replaced in the array
	const fold = (all) => all.map((place) => (place.id === "panel" ? after : place));
	const places = [before, { id: "board", x: 4, y: 0, w: 6, h: 9 }];
	const filled = arrange(fold(places), 10, { freed: { from: before, to: after } });
	const board = filled.find((place) => place.id === "board");

	check("the row takes back exactly what was freed", board.w, 9);
	check("and starts where the folded panel now ends", board.x, 1);
	check("the folded panel keeps its own width", filled.find((place) => place.id === "panel").w, 1);

	// two tiles share the gain in the ratio they already had
	const pair = [before, { id: "left", x: 4, y: 0, w: 4, h: 9 }, { id: "right", x: 8, y: 0, w: 2, h: 9 }];
	const shared = arrange(fold(pair), 10, { freed: { from: before, to: after } });
	const left = shared.find((place) => place.id === "left");
	const right = shared.find((place) => place.id === "right");
	// the exact split is the resolver's to choose; what must hold is that BOTH grew, the row
	// took the whole freed span, and neither jumped over the other
	check("both grew", [left.w > 4, right.w > 2], [true, true]);
	check("and together they fill the freed span", left.w + right.w, 9);
	check("they stay in order", left.x < right.x, true);
	check("and the first one closes up to the folded panel", left.x, 1);


	// REGRESSION: a row that is not the folded tile's row must not move at all
	const other = [before, { id: "below", x: 0, y: 9, w: 4, h: 3 }];
	const untouched = arrange(fold(other), 10, { freed: { from: before, to: after } });
	check("a tile on another row is left alone", untouched.find((place) => place.id === "below"), { id: "below", x: 0, y: 9, w: 4, h: 3 });

	// nothing was freed, so nothing moves
	check("expanding back to the same width changes nothing", arrange(places, 10, { freed: { from: before, to: before } }), places);
}


// REGRESSION: the sidebar spans ten rows, so the tab bar, the view bar and the board all
// "overlap" it — and laying them end to end in one line put the tab bar at column 1 and the
// board at column 3. Each row is its own row.
{
	const before = { id: "panel", x: 0, y: 0, w: 4, h: 10 };
	const after = { id: "panel", x: 0, y: 0, w: 1, h: 10, wasW: 4 };
	const stack = [
		after,
		{ id: "boards", x: 4, y: 0, w: 7, h: 1 },
		{ id: "views", x: 4, y: 1, w: 10, h: 1 },
		{ id: "board", x: 4, y: 2, w: 10, h: 8 },
	];
	const filled = arrange(stack, 14, { freed: { from: before, to: after } });
	const at = (id) => filled.find((place) => place.id === id);

	check("every row starts where the folded panel now ends", [at("boards").x, at("views").x, at("board").x], [1, 1, 1]);
	check("and every row took the freed columns", [at("boards").w, at("views").w, at("board").w], [10, 13, 13]);
	check("no row runs past the board", filled.every((place) => place.x + place.w <= 14), true);
	check("the panel itself is untouched", at("panel").w, 1);
}


// REGRESSION: narrowing the board dropped a tile to the next row instead of asking the tile
// beside it for the columns it still had. Both could give; only one was asked.
{
	const limits = (place) => (place.id === "panel" ? { minimum: { w: 4 } } : { minimum: { w: 6 } });
	const row = [
		{ id: "panel", x: 0, y: 0, w: 6, h: 9 },
		{ id: "board", x: 6, y: 0, w: 10, h: 9 },
	];

	const fitted = arrange(row, 14, { movedId: limits });
	const width = (id) => fitted.find((place) => place.id === id).w;
	check("the row was made to fit", width("panel") + width("board"), 14);
	check("and BOTH gave, neither fell", [width("panel") > 0, width("board") > 0], [true, true]);
	check("the wider one gave more", width("board") - 10 <= width("panel") - 6, true);
	check("nobody went under its own minimum", [width("panel") >= 4, width("board") >= 6], [true, true]);
	check("and the row starts at the left edge", fitted.find((place) => place.id === "panel").x, 0);

	// a row that already fits is not touched at all
	const roomy = [{ id: "panel", x: 0, y: 0, w: 4, h: 9 }, { id: "board", x: 4, y: 0, w: 6, h: 9 }];
	check("a row that fits is left exactly as it was", arrange(roomy, 14, { movedId: limits }), roomy);

	// when the minimums themselves do not fit, the row is squeezed as far as it honestly can
	const tight = arrange(row, 9, { movedId: limits });
	check("an impossible row still shrinks as far as it can", tight.reduce((total, place) => total + place.w, 0) <= 10, true);
}


// REGRESSION: folding a panel laid its row out from the widths; resizing the window scaled x
// and w INDEPENDENTLY, so rounding broke the row apart — gaps, overlaps, and packPlaces
// answering an overlap the only way it can, by pushing a tile down a row. Collapsing worked
// and resizing did not, and the difference was the law, not the numbers.
{
	const limits = (place) => ({ minimum: { w: 3 }, maximum: { w: 30 } });
	const wide = [
		{ id: "panel", x: 0, y: 0, w: 5, h: 10 },
		{ id: "boards", x: 5, y: 0, w: 15, h: 1 },
		{ id: "views", x: 5, y: 1, w: 15, h: 1 },
		{ id: "board", x: 5, y: 2, w: 15, h: 8 },
	];

	for (const columns of [20, 17, 14, 12, 10, 8, 6]) {
		const derived = arrange(wide, columns, { scaleFrom: 20, growthOf: limits });
		const rows = new Map();
		for (const place of derived) {
			if (!rows.has(place.y)) rows.set(place.y, []);
			rows.get(place.y).push(place);
		}

		const escaped = derived.filter((place) => place.x + place.w > columns || place.w < 1);
		check(`${columns} columns: nothing escapes the board`, escaped, []);

		// a row that held two tiles at 20 columns still holds two: nobody was pushed down
		const topRow = derived.filter((place) => place.y === 0).map((place) => place.id).sort();
		check(`${columns} columns: the panel and the tab bar stay side by side`, topRow, ["boards", "panel"]);

		// laid out from the widths, so no gap opens between neighbours
		for (const band of rows.values()) {
			const sorted = [...band].sort((left, right) => left.x - right.x);
			const gaps = sorted.slice(1).filter((place, index) => place.x !== sorted[index].x + sorted[index].w);
			check(`${columns} columns: row ${sorted[0].y} has no gap or overlap`, gaps, []);
		}
	}
}


// THE LAW: the board never refuses a width, so there is no minimum to check. What used to be
// minSize is now defaultSize — where a tile is BORN — and it constrains nothing afterwards.

// REGRESSION: rows that started flush ended at different widths once squeezed — one at
// column 5, the one under it at column 8 — because each tile was rounded on its own and the
// row was only ever brought DOWN to the board, never back up to it.
{
	const REAL = {
		sidebar: { minimum: { w: 1 }, maximum: { w: 6 } },
		boards: { minimum: { w: 2 }, maximum: { w: 20 } },
		views: { minimum: { w: 2 }, maximum: { w: 20 } },
		board: { minimum: { w: 3 }, maximum: { w: 30 } },
	};
	const limits = (place) => REAL[place.id] ?? {};
	const wide = [
		{ id: "sidebar", x: 0, y: 0, w: 4, h: 10 },
		{ id: "boards", x: 4, y: 0, w: 16, h: 1 },
		{ id: "views", x: 4, y: 1, w: 16, h: 1 },
		{ id: "board", x: 4, y: 2, w: 16, h: 8 },
	];

	for (const columns of [20, 17, 14, 12, 10, 8, 6, 5, 4, 3]) {
		const derived = arrange(wide, columns, { scaleFrom: 20, growthOf: limits });
		// every row that EXISTS reaches the edge; at phone widths a tile that cannot share a
		// row drops below and takes the whole width, which is the right answer on a phone
		const ends = [...new Set(derived.map((place) => place.y))]
			.sort((left, right) => left - right)
			.map((y) => Math.max(...derived.filter((place) => place.y === y).map((place) => place.x + place.w)));
		check(`${columns} columns: every row reaches the edge`, ends.filter((end) => end !== columns), []);
		check(`${columns} columns: nothing escapes`, derived.filter((place) => place.x + place.w > columns || place.w < 1), []);
		const together = derived.filter((place) => place.y === 0).length;
		check(`${columns} columns: the tab bar sits beside the sidebar${columns <= 3 ? " or below it" : ""}`, columns <= 3 ? together >= 1 : together === 2, true);
	}

	// and the sidebar really does give all the way down, because its own floor says 1
	const phone = arrange(wide, 4, { scaleFrom: 20, growthOf: limits });
	check("on four columns the sidebar is down to one", phone.find((place) => place.id === "sidebar").w, 1);
	check("and the tab bar has the rest", phone.find((place) => place.id === "boards").w, 3);
}


// REGRESSION: the width a folded tile goes back to lived only in memory. Folding wrote the
// file, the file came back without it, and unfolding restored the tile to its folded width —
// the button looked dead because pressing it changed nothing.
{
	const start = normalizeBoard({
		tiles: [{ id: "panel", widget: "@orbitask/kanban-board" }],
		layouts: { 20: { places: [{ id: "panel", x: 0, y: 0, w: 5, h: 9 }] } },
	});

	const folded = {
		...start,
		tiles: start.tiles.map((tile) => ({ ...tile, folded: true })),
		layouts: { 20: start.layouts[20].map((place) => ({ ...place, w: 1, wasW: place.w })) },
	};

	// through the file and back
	const reopened = normalizeBoard(serializeBoard(folded));
	check("the file remembers it is folded", reopened.tiles[0].folded, true);
	check("and the width it goes back to", reopened.layouts[20][0].wasW, 5);

	const unfolded = reopened.layouts[20].map((place) => ({ ...place, w: place.wasW ?? place.w, wasW: undefined }));
	check("unfolding after a reload restores the real width", unfolded[0].w, 5);

	// and a file written under the old name still carries its width
	const legacy = normalizeBoard({
		tiles: [{ id: "panel", widget: "@orbitask/kanban-board" }],
		layouts: { 20: { places: [{ id: "panel", x: 0, y: 0, w: 1, h: 9, restoreW: 6 }] } },
	});
	check("an old file is folded", legacy.tiles[0].folded, true);
	check("and keeps the width it was folded from", legacy.layouts[20][0].wasW, 6);
}


// REGRESSION: widening a tile by hand dropped its neighbour to the next row. The law "a row
// that no longer fits shares the loss" was written for a screen resize and for a fold, and
// never for a drag — so the one path a person actually touches was the one without it.
{
	const row = [
		{ id: "panel", x: 0, y: 0, w: 4, h: 9 },
		{ id: "board", x: 4, y: 0, w: 16, h: 9 },
	];

	// the person drags the panel from 4 to 8 columns
	const dragged = [{ ...row[0], w: 8 }, row[1]];
	const settled = arrange(dragged, 20, { movedId: "panel" });
	const at = (id) => settled.find((place) => place.id === id);

	check("the tile you dragged keeps the width you gave it", at("panel").w, 8);
	check("the neighbour narrows instead of falling", at("board").w, 12);
	check("and stays on the same row", at("board").y, 0);
	check("sitting right after it", at("board").x, 8);
	check("the row still fills the board", at("panel").w + at("board").w, 20);

	// three in a row: the loss is shared, not dumped on whoever is last
	const three = [
		{ id: "a", x: 0, y: 0, w: 10, h: 4 },
		{ id: "b", x: 10, y: 0, w: 5, h: 4 },
		{ id: "c", x: 15, y: 0, w: 5, h: 4 },
	];
	const grown = arrange([{ ...three[0], w: 14 }, three[1], three[2]], 20, { movedId: "a" });
	const width = (id) => grown.find((place) => place.id === id).w;
	check("the dragged one is untouched", width("a"), 14);
	check("both neighbours give, neither is dropped", [width("b"), width("c")], [3, 3]);
	check("everyone is still on the first row", grown.every((place) => place.y === 0), true);

	// dragging one wider than the whole board takes from everyone, and still nobody falls
	const huge = arrange([{ ...three[0], w: 19 }, three[1], three[2]], 20, { movedId: "a" });
	// SCENARIO 5: when the row genuinely cannot hold everyone, dropping is the honest answer —
	// what must never happen is a tile leaving the board or two sharing a cell
	check("an impossible drag leaves nothing off the board", huge.every((place) => place.x + place.w <= 20), true);
	check("and every tile is at least one column", huge.every((place) => place.w >= 1), true);
}


// REGRESSION: a tile placed at the RIGHT edge of its row was dragged half a screen to the
// left the moment anything else in the row changed, because the row was re-laid flush from
// the left. A gap a person left is theirs; the board may only close one to stop an overlap.
{
	const before = { id: "panel", x: 0, y: 0, w: 4, h: 10 };
	const after = { id: "panel", x: 0, y: 0, w: 1, h: 10, wasW: 4 };
	//                                  tabs on the left, filter hard against the right edge
	const row = [after, { id: "tabs", x: 4, y: 0, w: 6, h: 1 }, { id: "filter", x: 16, y: 0, w: 4, h: 1 }];

	const filled = arrange(row, 20, { freed: { from: before, to: after } });
	const at = (id) => filled.find((place) => place.id === id);

	check("the filter stays on the right", at("filter").x + at("filter").w, 20);
	check("the tabs stay on the left", at("tabs").x, 1);
	check("and the gap between them survives", at("filter").x > at("tabs").x + at("tabs").w, true);
	check("nothing overlaps", at("tabs").x + at("tabs").w <= at("filter").x, true);
	check("and nothing runs off the board", filled.every((place) => place.x + place.w <= 20), true);
}


// THE ONE FROM THE LOG. Widening the sidebar from 1 to 2 put its right edge inside the tab
// bar's left edge. The row was nowhere near full — 2 + 4 + 2 out of 17 — so the fitting step
// had nothing to do, and packPlaces answered the overlap the only way it knows: it pushed the
// tab bar to row 11 and the board and popup after it. Overlapping is not the same as not
// fitting, and only one of the two had an answer.
{
	const columns = 17;
	const dragged = [
		{ id: "panel", x: 0, y: 0, w: 2, h: 11 },
		{ id: "tabs", x: 1, y: 0, w: 4, h: 1 },
		{ id: "filter", x: 15, y: 0, w: 2, h: 1 },
	];

	const settled = arrange(dragged, columns, { movedId: "panel" });
	const at = (id) => settled.find((place) => place.id === id);

	check("the tab bar stays on the top row", at("tabs").y, 0);
	check("and slides clear of the widened panel", at("tabs").x >= 2, true);
	check("the panel keeps the width it was dragged to", at("panel").w, 2);
	check("the filter is still on the right", at("filter").x + at("filter").w, columns);
	check("nobody was pushed down", settled.every((place) => place.y === 0), true);
	check("and nothing overlaps", overlapping(settled), false);
}

function overlapping(places) {
	for (const a of places) {
		for (const b of places) {
			if (a === b) continue;
			if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return true;
		}
	}
	return false;
}


// A FULL ROW, WIDENED BY ONE. The row uses every column, so there is nowhere to step into —
// and the answer must still be sideways-then-narrower, never "drop to the bottom of the board".
{
	const columns = 12;
	const full = [
		{ id: "a", x: 0, y: 0, w: 3, h: 2 },
		{ id: "b", x: 3, y: 0, w: 3, h: 2 },
		{ id: "c", x: 6, y: 0, w: 3, h: 2 },
		{ id: "d", x: 9, y: 0, w: 3, h: 2 },
	];
	check("the row starts full", full.reduce((total, place) => total + place.w, 0), columns);

	// drag `a` one column wider
	const settled = arrange([{ ...full[0], w: 4 }, ...full.slice(1)], columns, { movedId: "a" });
	const at = (id) => settled.find((place) => place.id === id);

	check("everyone stays on the row", settled.every((place) => place.y === 0), true);
	check("the dragged tile got the column it asked for", at("a").w, 4);
	check("and the row still ends at the board edge", at("d").x + at("d").w, columns);
	check("nothing overlaps", overlapping(settled), false);
	check("a neighbour gave the column, not the dragged tile", at("b").w, 2);
	check("and the row has no gaps left in it", [at("b").x, at("c").x, at("d").x], [4, 6, 9]);

	// the push reaches past the first neighbour: every tile after the dragged one has moved
	// over, which is what stops any of them being dropped to the next row
	check("the whole row shifted, not just the neighbour", settled.map((place) => place.x), [0, 4, 6, 9]);
	check("and it is still one continuous row", settled.every((place, index) => index === 0 || place.x === settled[index - 1].x + settled[index - 1].w), true);

	// dragging the LAST tile wider pushes the others LEFT, not down
	const fromRight = arrange([...full.slice(0, 3), { ...full[3], x: 8, w: 4 }], columns, { movedId: "d" });
	const rightAt = (id) => fromRight.find((place) => place.id === id);
	check("widening the last tile keeps everyone on the row", fromRight.every((place) => place.y === 0), true);
	check("and pushes its neighbour left", rightAt("c").x + rightAt("c").w <= rightAt("d").x, true);
	check("the row still starts at the left edge", Math.min(...fromRight.map((place) => place.x)), 0);
	check("and nothing overlaps", overlapping(fromRight), false);
}

console.log(failed ? `\n${failed} failed` : "\na panel folds, the row fills in, and it comes back where it was");
process.exit(failed ? 1 : 0);
