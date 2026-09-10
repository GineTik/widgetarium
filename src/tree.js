import { heldBetween } from "./give.js";

export const GAP_PX = 8;
export const LADDER = 12;
export const MIN_HEIGHT_PX = 42;
const HAIR_PX = 0.5;
export const SIDEBAR_PX = 280;
export const REGION_PAD_PX = 8;
export const REGION_GAP_PX = 16;
export const MAIN_FLOOR_PX = 480;
export const REGIONS = ["left", "main", "right"];

// TODO: column groups inside a row — no board needs one yet
export function layTree(rows, width, gap = GAP_PX) {
	return rows.flatMap((row, from) => laidRow(row, from, width, gap));
}

function laidRow(row, from, width, gap) {
	const inner = innerOf(row.length, width, gap);
	const widths = widthsOf(row, inner);
	if (row.some((cell, at) => widths[at] + HAIR_PX < cell.minPx)) return row.map((cell) => ({ from, cells: [sized(cell, width, 1)] }));
	const grows = growsOf(row);
	return [{ from, cells: row.map((cell, at) => sized(cell, widths[at], grows[at])) }];
}

export function innerOf(cells, width, gap = GAP_PX) {
	return width - gap * (cells - 1);
}

export function widthsOf(row, inner) {
	const total = row.reduce((sum, cell) => sum + cell.ratio, 0);
	return row.map((cell) => (inner * cell.ratio) / total);
}

export function growsOf(row) {
	return widthsOf(row, 1);
}

function sized(cell, width, grow) {
	return { id: cell.id, width, grow, ratio: cell.ratio, minPx: cell.minPx, cap: cell.cap ?? 0, height: cell.height ?? null };
}

export function resized(row, at, { boundaryPx, inner, isFree, give }) {
	const total = row.reduce((sum, cell) => sum + cell.ratio, 0);
	const widths = widthsOf(row, inner);
	const before = widths.slice(0, at).reduce((sum, one) => sum + one, 0);
	const pair = widths[at] + widths[at + 1];
	const low = row[at].minPx ?? 0;
	const high = Math.max(low, pair - (row[at + 1].minPx ?? 0));
	const wanted = boundaryPx - before;
	const asked = isFree ? wanted : snapped(wanted, inner);
	const held = Math.min(Math.max(heldBetween(asked, low, high, give), 0), pair);
	return row.map((cell, index) => {
		if (index === at) return { ...cell, ratio: (held * total) / inner };
		if (index === at + 1) return { ...cell, ratio: ((pair - held) * total) / inner };
		return cell;
	});
}

export function restacked(row, wantedPx, give) {
	const floor = shortestOf(row);
	const tall = Math.round(heldBetween(wantedPx, floor, Math.max(floor, tallestOfManifests(row)), give));
	return row.map((cell) => ({ ...cell, height: tall }));
}

function shortestOf(row) {
	return row.reduce((most, cell) => Math.max(most, cell.shortestPx ?? 0), MIN_HEIGHT_PX);
}

function tallestOfManifests(row) {
	if (row.some((cell) => !cell.tallestPx)) return Infinity;
	return row.reduce((most, cell) => Math.max(most, cell.tallestPx), 0);
}

export function tallestOf(row) {
	return row.reduce((most, cell) => Math.max(most, cell.height ?? 0), 0);
}

// TRADE-OFF: a row the target no longer names takes the cell as a row of its own; dropping it would lose the tile
function opened(rows, fresh, target) {
	if (target.kind === "row") return [...rows.slice(0, target.at), [fresh], ...rows.slice(target.at)];
	if (!rows[target.row]) return [...rows, [fresh]];
	return rows.map((row, index) => (index === target.row ? [...row.slice(0, target.at), fresh, ...row.slice(target.at)] : row));
}

export function withoutCell(rows, id) {
	return rows.map((row) => row.filter((cell) => cell.id !== id)).filter((row) => row.length > 0);
}

export function rowIndexesAfterLeaving(rows, id) {
	let gone = 0;
	return rows.map((row, at) => {
		if (row.some((cell) => cell.id !== id)) return at - gone;
		gone += 1;
		return null;
	});
}

export function moved(rows, id, target) {
	const held = rows.flat().find((cell) => cell.id === id);
	if (!held || !target) return rows;
	return opened(withoutCell(rows, id), { ...held }, target);
}

export function carriedInto(layout, { id, from, to, target }) {
	if (!target || !layout?.[from] || !layout?.[to]) return layout;
	if (from === to) return { ...layout, [from]: { ...layout[from], rows: moved(layout[from].rows, id, target) } };
	const held = layout[from].rows.flat().find((cell) => cell.id === id);
	if (!held) return layout;
	return {
		...layout,
		[from]: { ...layout[from], rows: withoutCell(layout[from].rows, id) },
		[to]: { ...layout[to], rows: opened(withoutCell(layout[to].rows, id), { ...held }, target) },
	};
}

export const ROW_EDGE_SHARE = 0.28;
export const ROW_EDGE_CEILING_PX = 64;

export function aimedAt(bands, x, y) {
	if (bands.length === 0) return { kind: "row", at: 0 };
	if (y < bands[0].top) return { kind: "row", at: bands[0].from };
	const band = bands.find((one) => y >= one.top && y <= one.bottom);
	if (!band) return { kind: "row", at: bands[bands.length - 1].from + 1 };
	return compassIn(band, x, y);
}

function compassIn(band, x, y) {
	const edge = Math.min((band.rowBottom - band.top) * ROW_EDGE_SHARE, ROW_EDGE_CEILING_PX);
	if (y < band.top + edge) return { kind: "row", at: band.from };
	if (y > band.rowBottom - edge) return { kind: "row", at: band.from + 1 };
	return besideIn(band, x);
}

function besideIn(band, x) {
	const at = band.cells.findIndex((cell) => x <= cell.right);
	if (at < 0) return { kind: "beside", row: band.from, at: band.cells.length };
	const cell = band.cells[at];
	return { kind: "beside", row: band.from, at: x < cell.left + (cell.right - cell.left) / 2 ? at : at + 1 };
}

export const MIN_SIDEBAR_PX = 200;

export function sidebarWidth(layout, name) {
	return layout[name]?.width ?? SIDEBAR_PX;
}

export function foldableIn(layout) {
	return REGIONS.filter((name) => name !== "main" && layout?.[name]);
}

export function isFolded(layout, name) {
	return Boolean(layout?.[name]?.folded);
}

export function toggledFold(layout, name) {
	return { ...layout, [name]: { ...layout[name], folded: !isFolded(layout, name) } };
}

export function columnsOf(layout, width, gap = REGION_GAP_PX) {
	const named = REGIONS.filter((name) => layout[name] && !isFolded(layout, name));
	if (!named.includes("main")) return { beside: [], stacked: named };
	const sides = named.filter((name) => name !== "main");
	for (const kept of [sides, sides.filter((name) => name !== "right"), []]) {
		const shown = ["main", ...kept];
		const taken = kept.reduce((sum, name) => sum + gap + sidebarWidth(layout, name), 0);
		const room = width - taken;
		if (room < MAIN_FLOOR_PX) continue;
		return {
			beside: named.filter((name) => shown.includes(name)).map((name) => ({ name, width: name === "main" ? room : sidebarWidth(layout, name) })),
			stacked: named.filter((name) => !shown.includes(name)),
		};
	}
	return { beside: [], stacked: named };
}

export function widenedRegion(layout, name, wantedPx, width, gap = REGION_GAP_PX, give) {
	const other = REGIONS.filter((one) => one !== "main" && one !== name && layout[one] && !isFolded(layout, one));
	const taken = other.reduce((sum, one) => sum + gap + sidebarWidth(layout, one), 0);
	return Math.round(heldBetween(wantedPx, MIN_SIDEBAR_PX, width - taken - gap - MAIN_FLOOR_PX, give));
}

export function isUnder(box, pointer) {
	return pointer.clientX >= box.left && pointer.clientX <= box.right && pointer.clientY >= box.top && pointer.clientY <= box.bottom;
}

export function sameTarget(one, other) {
	if (!one || !other) return one === other;
	return one.kind === other.kind && one.at === other.at && one.row === other.row;
}

function snapped(px, inner) {
	const step = inner / LADDER;
	return Math.round(px / step) * step;
}
