// WHERE A TILE GOES — the whole of it, and the only place that decides.
//
// The scenarios this implements are written out in docs/arrange-scenarios.md, step by step.
// Read those first: every rule below is one of them, and the reason each rule exists is a
// board that broke without it.
//
// PRIOR ART, and why it is not simply copied: react-grid-layout and gridstack both resolve a
// collision by moving the other tile UP or DOWN, never sideways — and react-grid-layout has a
// standing bug where those cascades rearrange a board on their own. A tile that steps aside
// instead of dropping is what this board wants, so the rule is written here rather than
// borrowed, and it is written once.

export const FOLDED_COLUMNS = 1;

// ── The one way in ───────────────────────────────────────────────────────────────────────
//
//   arrange(places, columns, { movedId })          a person resized something
//   arrange(places, columns, { movedId, moving })  a person MOVED it — nothing is resized
//   arrange(places, columns, { freed })            a panel folded or unfolded
//   arrange(places, columns, { scaleFrom })        the screen changed width
//   arrange(places, columns, { reading: true })    nothing happened; read it back
//
// Callers say WHAT happened. Nothing outside this file decides where a tile ends up — eight
// functions used to, and between them a tile reached column 47 of a 17-column board.
export function arrange(places, columns, intent = {}) {
	const { movedId, freed, scaleFrom, growthOf, reading, moving } = intent;

	// READING IS NOT A CHANGE. An arrangement a person made comes back exactly; only an
	// overlap the file should not have contained is resolved, and only downwards.
	if (reading) return settleOverlaps(places.map((place) => onBoard(place, columns)));

	// asked for, never automatic
	if (intent.autoFit) return resolve(autoFit(places, columns), columns);

	if (scaleFrom) return resolve(scaled(places, scaleFrom, columns, growthOf), columns);
	// A fold gives columns back. The row grows into them, and the tile that sat NEXT to the
	// folded one closes up to its new edge — the rest keep the gaps their author left, which
	// is why this is not "pack the row" but "close the one gap that just appeared".
	// the tile that folded IS the held one — the caller does not have to say so twice
	if (freed) {
		return resolve(widenInto(places, freed.from, freed.to, columns), columns, movedId ?? freed.from.id, {
			closeFirst: true,
		});
	}

	// MOVING IS NOT RESIZING. Carrying a tile across the board must not narrow whatever it
	// passes over: a person who moved something and found their other widget a column thinner
	// has been charged for an action they did not take.
	return resolve(places, columns, movedId, { narrow: !moving });
}

// ── The resolver ─────────────────────────────────────────────────────────────────────────
//
// Two steps and a floor, in this order. An earlier attempt walked outward from the held tile
// nudging each collider aside one at a time; it was longer, it could swap two tiles round, and
// it could not see that a row was over-wide until it had already given up. Narrowing first and
// laying out second is both shorter and right.
function resolve(places, columns, heldId, { narrow = true, closeFirst = false } = {}) {
	const board = places.map((place) => ({ ...place }));

	if (narrow) narrowRows(board, columns, heldId);
	layOutRows(board, columns, heldId, closeFirst);

	return settleOverlaps(board.map((place) => onBoard(place, columns)), heldId);
}

// SCENARIO 2: a row wider than the board gives columns back, one at a time, from whoever is
// widest and is not the tile a person is holding.
//
// A ROW IS A ROW OF CELLS, not a group of tiles that happen to touch. A tall tile counts in
// every row it spans — measuring a whole connected group instead is what left a sidebar's rows
// looking as if they fitted while each of them was over-wide on its own.
function narrowRows(board, columns, heldId) {
	for (const y of rowIndexes(board)) {
		const row = board.filter((place) => place.y <= y && y < place.y + place.h);
		let guard = columns * (row.length + 1);

		// SCENARIO 5: if the row cannot fit even with everyone else at a single column, then
		// somebody is going to drop whatever happens — so nobody is narrowed on the way out.
		// Shrinking tiles that are about to be dropped anyway is loss for nothing.
		const held = row.find((place) => place.id === heldId);
		const floor = (held ? held.w : 1) + (row.length - (held ? 1 : 0));
		if (floor > columns) continue;

		while (widthOf(row) > columns && guard > 0) {
			guard -= 1;
			// NEVER the held tile. A person widening something means it; taking the columns
			// back from the very tile under their pointer is the one answer nobody wants.
			const giver = row
				.filter((place) => place.w > 1 && place.id !== heldId)
				.sort((left, right) => right.w - left.w)[0];
			if (!giver) break;
			giver.w -= 1;
		}
	}
}

// SCENARIOS 1, 3 and 4: every row laid out from the held tile OUTWARD — rightwards to its
// right, leftwards to its left. The order tiles were in is the order they stay in: a push
// never swaps two tiles round, because a tile appearing on the other side of its neighbour is
// not something anybody asked for.
//
// A tile is positioned once, on the first row it appears in, so a tall tile is not dragged
// about by each row it spans.
function layOutRows(board, columns, heldId, closeFirst = false) {
	const placed = new Set();

	for (const y of rowIndexes(board)) {
		const row = board
			.filter((place) => place.y <= y && y < place.y + place.h)
			.sort((left, right) => left.x - right.x);
		const held = row.find((place) => place.id === heldId);

		let edge = held ? held.x + held.w : 0;
		if (held) placed.add(held.id);

		let first = true;
		// the held tile is not one of its own neighbours: leaving it in made it "the first tile
		// after the held one", and the gap that should have closed stayed open
		for (const place of row.filter((other) => other.id !== heldId && (!held || other.x >= held.x))) {
			if (placed.has(place.id)) {
				edge = Math.max(edge, place.x + place.w);
				first = false;
				continue;
			}
			const wanted = closeFirst && first && held ? edge : Math.max(edge, place.x);
			first = false;
			place.x = Math.max(0, Math.min(wanted, columns - place.w));
			edge = place.x + place.w;
			placed.add(place.id);
		}

		if (!held) continue;

		let left = held.x;
		for (const place of row.filter((other) => other.x < held.x).reverse()) {
			if (placed.has(place.id)) {
				left = Math.min(left, place.x);
				continue;
			}
			place.x = Math.max(0, Math.min(place.x, left - place.w));
			left = place.x;
			placed.add(place.id);
		}
	}
}

function widthOf(row) {
	return row.reduce((total, place) => total + place.w, 0);
}

function rowIndexes(board) {
	const rows = new Set();
	for (const place of board) {
		for (let y = place.y; y < place.y + place.h; y += 1) rows.add(y);
	}
	return [...rows].sort((left, right) => left - right);
}

// SCENARIO 5: the floor. Whatever the steps above decide, a tile ends up on the board and two
// tiles never share a cell.
//
// A TILE STAYS ON THE ROW IT WAS PUT ON. It used to be offered row 0 and take the first free
// one, so a tile floated upward the moment anything above it moved — a board rearranging
// itself under a person who had only meant to widen something. Now a row is only ever left
// because the tile is standing on somebody, and then it takes the next row down and no more.
//
// Filling the empty cells that leaves behind is a deliberate act, not a background one: the
// Auto-fit control does it when asked.
function settleOverlaps(places, heldId) {
	const held = places.find((place) => place.id === heldId);
	const rest = places
		.filter((place) => place.id !== heldId)
		.sort((first, second) => first.y - second.y || first.x - second.x);

	const settled = [];
	if (held) settled.push(held);

	for (const place of rest) {
		let y = place.y;
		while (settled.some((other) => collides({ ...place, y }, other))) y += 1;
		settled.push(y === place.y ? place : { ...place, y });
	}

	// the caller's order is the caller's: settling decides rows, never the list
	const byId = new Map(settled.map((place) => [place.id, place]));
	return places.map((place) => byId.get(place.id) ?? place);
}

// AUTO-FIT, and only when a person presses it. Every tile grows into the free cells beside it
// and below it, in reading order, until the board has no room left to give. Asked for, it is
// useful; done on its own it is a board that will not sit still.
function autoFit(places, columns) {
	const grown = places.map((place) => ({ ...place }));
	const rows = Math.max(1, ...grown.map((place) => place.y + place.h));

	const free = (candidate, self) =>
		candidate.x >= 0 &&
		candidate.x + candidate.w <= columns &&
		!grown.some((other) => other.id !== self.id && collides(candidate, other));

	for (const place of [...grown].sort((left, right) => left.y - right.y || left.x - right.x)) {
		while (free({ ...place, w: place.w + 1 }, place)) place.w += 1;
		while (free({ ...place, x: place.x - 1, w: place.w + 1 }, place)) {
			place.x -= 1;
			place.w += 1;
		}
		while (place.y + place.h < rows && free({ ...place, h: place.h + 1 }, place)) place.h += 1;
	}

	return grown;
}

// SCENARIO 7: deriving a width is a change like any other — scale, then resolve, so it cannot
// disagree with what a drag would have done.
function scaled(places, fromColumns, toColumns, growthOf = () => "fill") {
	const factor = toColumns / fromColumns;
	const growing = toColumns > fromColumns;

	const out = places.map((place) => {
		const keeps = growing && growthOf(place) === "keep";
		return onBoard(
			{ ...place, x: Math.round(place.x * factor), w: keeps ? place.w : Math.max(1, Math.round(place.w * factor)) },
			toColumns,
		);
	});

	// SCENARIO 8: a row that filled the board keeps filling it. Rounding each tile on its own
	// leaves the row a column or two short, and a row that used to end at the edge now ending
	// two columns inside it reads as the board being broken — which is exactly what it looked
	// like. The remainder goes to the widest tile that is allowed to grow.
	for (const y of rowIndexes(places)) {
		const before = places.filter((place) => place.y <= y && y < place.y + place.h);
		if (widthOf(before) < fromColumns) continue;

		const after = out.filter((place) => before.some((source) => source.id === place.id));
		let short = toColumns - widthOf(after);
		const able = after
			.filter((place) => growthOf(place) !== "keep")
			.sort((left, right) => right.w - left.w);
		if (able.length === 0) continue;

		for (let index = 0; short > 0; index = (index + 1) % able.length) {
			able[index].w += 1;
			short -= 1;
		}
	}

	return out;
}

// A panel folded and gave its columns back. The row it sat in grows into them in proportion —
// a tile that was half the row stays half the row — and the result goes through the resolver
// like anything else.
function widenInto(places, from, to, columns) {
	const gained = from.w - to.w;
	if (gained <= 0) return places;

	const out = places.map((place) => ({ ...place }));

	// EACH ROW GAINS THE FREED COLUMNS, not a share of them. A folded sidebar eleven rows tall
	// frees three columns on every one of those rows; spreading three columns across all of
	// them together left each row two short and the board looking broken from top to bottom.
	// ONCE PER TILE. Walking every row index widened a tall tile once for each row it spans —
	// nine passes for a nine-row sidebar, each compounding the last, and the two tiles beside
	// it ended up swapping their share of the gain between them.
	const grown = new Set();

	for (const y of rowIndexes(out)) {
		if (!(from.y <= y && y < from.y + from.h)) continue;
		const row = out.filter(
			(place) => place.id !== from.id && !grown.has(place.id) && place.y <= y && y < place.y + place.h,
		);
		if (row.length === 0) continue;
		for (const place of row) grown.add(place.id);

		const had = widthOf(row);
		if (had === 0) continue;

		let spent = 0;
		row.forEach((place, index) => {
			const isLast = index === row.length - 1;
			const want = isLast ? had + gained - spent : Math.round(place.w * ((had + gained) / had));
			place.w = Math.max(1, Math.min(want, columns));
			spent += place.w;
		});
	}

	return out;
}

function onBoard(place, columns) {
	const w = Math.max(1, Math.min(place.w, columns));
	const x = Math.max(0, Math.min(place.x, columns - w));
	const h = Math.max(1, place.h);
	const y = Math.max(0, place.y);
	return w === place.w && x === place.x && h === place.h && y === place.y ? place : { ...place, w, x, h, y };
}

function collides(a, b) {
	return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function sharesRows(a, b) {
	return a.y < b.y + b.h && b.y < a.y + a.h;
}

// TRADE-OFF: bounds the span a drag asks for, never a wall arrange() must route around
export function clampPlace(place, columns, minimum, maximum) {
	return onBoard(withinBounds(place, minimum, maximum), columns);
}

function withinBounds(place, minimum, maximum) {
	const w = Math.min(Math.max(place.w, minimum?.w ?? 1), maximum?.w ?? Infinity);
	const h = Math.min(Math.max(place.h, minimum?.h ?? 1), maximum?.h ?? Infinity);
	return w === place.w && h === place.h ? place : { ...place, w, h };
}


export function rowsOf(places) {
	return places.reduce((rows, place) => Math.max(rows, place.y + place.h), 0);
}

// How far the content pulls back from the tile's edge when the pointer arrives, so the ring
// and its buttons have somewhere to sit. The rule is half a cell a side, but taken literally
// it breaks twice: on a 1x1 half a cell a side IS the whole tile, and on a 6x2 the two axes
// need factors 31% apart, which squashes the content. So the inset is capped at a share of
// the SHORTER side and the scale stays uniform — nothing is ever distorted, and a long tile
// simply gets a wider margin along its length.
const HOVER_INSET_RATIO = 0.22;

export function hoverScale(pixels, cell) {
	const shortest = Math.min(pixels.width, pixels.height);
	if (shortest <= 0) return 1;
	const inset = Math.min(cell / 2, shortest * HOVER_INSET_RATIO);
	return 1 - (2 * inset) / shortest;
}

export function spanToPixels(cells, cell, gap) {
	return cells * cell + (cells - 1) * gap;
}

export function toPixels(place, cell, gap) {
	return {
		left: place.x * (cell + gap),
		top: place.y * (cell + gap),
		width: place.w * cell + (place.w - 1) * gap,
		height: place.h * cell + (place.h - 1) * gap,
	};
}

// A SIZE is not a position: n cells span n*cell + (n-1)*gap, so the gap has to be added
// back before dividing. Measured with the position formula, the step from 3 to 4 cells
// landed at 70% of the way instead of 50% — a cell had to be dragged almost fully to be
// gained and was lost after a third of the way back.
export function toCellSpan(sizePx, cell, gap) {
	return Math.max(1, Math.round((sizePx + gap) / (cell + gap)));
}

export function toCells(left, top, cell, gap) {
	const pitch = cell + gap;
	return { x: Math.max(0, Math.round(left / pitch)), y: Math.max(0, Math.round(top / pitch)) };
}

