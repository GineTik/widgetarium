export const GAP_PX = 12;
export const LADDER = 12;
export const MIN_HEIGHT_PX = 80;

// TODO: column groups inside a row — no board needs one yet
export function layTree(rows, width, gap = GAP_PX) {
	return rows.flatMap((row, from) => laidRow(row, from, width, gap));
}

function laidRow(row, from, width, gap) {
	const inner = innerOf(row.length, width, gap);
	const widths = widthsOf(row, inner);
	if (row.some((cell, at) => widths[at] < cell.minPx)) return row.map((cell) => ({ from, cells: [sized(cell, width)] }));
	return [{ from, cells: row.map((cell, at) => sized(cell, widths[at])) }];
}

export function innerOf(cells, width, gap = GAP_PX) {
	return width - gap * (cells - 1);
}

export function widthsOf(row, inner) {
	const total = row.reduce((sum, cell) => sum + cell.ratio, 0);
	return row.map((cell) => (inner * cell.ratio) / total);
}

function sized(cell, width) {
	return { id: cell.id, width, minPx: cell.minPx, cap: cell.cap ?? 0, height: cell.height ?? null };
}

export function resized(row, at, boundaryPx, inner, isFree) {
	const total = row.reduce((sum, cell) => sum + cell.ratio, 0);
	const widths = widthsOf(row, inner);
	const before = widths.slice(0, at).reduce((sum, one) => sum + one, 0);
	const pair = widths[at] + widths[at + 1];
	const low = row[at].minPx ?? 0;
	const high = Math.max(low, pair - (row[at + 1].minPx ?? 0));
	const wanted = boundaryPx - before;
	const held = Math.min(Math.max(isFree ? wanted : snapped(wanted, inner), low), high);
	return row.map((cell, index) => {
		if (index === at) return { ...cell, ratio: (held * total) / inner };
		if (index === at + 1) return { ...cell, ratio: ((pair - held) * total) / inner };
		return cell;
	});
}

export function restacked(row, wantedPx) {
	const tall = Math.max(MIN_HEIGHT_PX, Math.round(wantedPx));
	return row.map((cell) => ({ ...cell, height: tall }));
}

export function tallestOf(row) {
	return row.reduce((most, cell) => Math.max(most, cell.height ?? 0), 0);
}

export function moved(rows, id, target) {
	const held = rows.flat().find((cell) => cell.id === id);
	if (!held || !target) return rows;
	const fresh = { ...held };
	const opened =
		target.kind === "row"
			? [...rows.slice(0, target.at), [fresh], ...rows.slice(target.at)]
			: rows.map((row, index) => (index === target.row ? [...row.slice(0, target.at), fresh, ...row.slice(target.at)] : row));
	return opened.map((row) => row.filter((cell) => cell === fresh || cell.id !== id)).filter((row) => row.length > 0);
}

export function aimedAt(bands, x, y) {
	if (bands.length === 0) return null;
	if (y < bands[0].top) return { kind: "row", at: bands[0].from };
	const band = bands.find((one) => y >= one.top && y <= one.bottom);
	if (!band) return { kind: "row", at: bands[bands.length - 1].from + 1 };
	if (y > band.rowBottom) return { kind: "row", at: band.from + 1 };
	const at = band.cells.findIndex((cell) => x <= cell.right);
	const cell = band.cells[at < 0 ? band.cells.length - 1 : at];
	if (at < 0) return { kind: "beside", row: band.from, at: band.cells.length, edge: cell.right };
	const isBefore = x < cell.left + (cell.right - cell.left) / 2;
	return { kind: "beside", row: band.from, at: isBefore ? at : at + 1, edge: isBefore ? cell.left : cell.right };
}

export function sameTarget(one, other) {
	if (!one || !other) return one === other;
	return one.kind === other.kind && one.at === other.at && one.row === other.row;
}

function snapped(px, inner) {
	const step = inner / LADDER;
	return Math.round(px / step) * step;
}
