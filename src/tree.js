export const GAP_PX = 8;
export const LADDER = 12;
export const MIN_HEIGHT_PX = 80;
const HAIR_PX = 0.5;
export const SIDEBAR_PX = 280;
export const REGION_PAD_PX = 8;
export const MAIN_FLOOR_PX = 480;
export const REGIONS = ["left", "main", "right"];

// TODO: column groups inside a row — no board needs one yet
export function layTree(rows, width, gap = GAP_PX) {
	return rows.flatMap((row, from) => laidRow(row, from, width, gap));
}

function laidRow(row, from, width, gap) {
	const inner = innerOf(row.length, width, gap);
	const widths = widthsOf(row, inner);
	if (row.some((cell, at) => widths[at] + HAIR_PX < cell.minPx)) return row.map((cell) => ({ from, cells: [sized(cell, width)] }));
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

export function resized(row, at, { boundaryPx, inner, isFree }) {
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
	return besideIn(band, x);
}

function besideIn(band, x) {
	const at = band.cells.findIndex((cell) => x <= cell.right);
	if (at < 0) return { kind: "beside", row: band.from, at: band.cells.length, edge: band.cells.at(-1).right };
	const cell = band.cells[at];
	const isBefore = x < cell.left + (cell.right - cell.left) / 2;
	return { kind: "beside", row: band.from, at: isBefore ? at : at + 1, edge: isBefore ? cell.left : cell.right };
}

export function sidebarWidth(layout, name) {
	return layout[name]?.width ?? SIDEBAR_PX;
}

export function columnsOf(layout, width, gap = GAP_PX) {
	const named = REGIONS.filter((name) => layout[name]?.rows.length > 0);
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

const NOTHING_MOVES = { cells: {}, bands: {}, slot: null };

export function partedBy(bands, target, carried, gap = GAP_PX) {
	if (!target || bands.length === 0) return NOTHING_MOVES;
	if (target.kind !== "beside") return partedAsRow(bands, target, carried, gap);
	const band = bands.find((one) => one.from === target.row);
	return band ? partedBeside(band, target, carried, gap) : NOTHING_MOVES;
}

function partedBeside(band, target, carried, gap) {
	const cells = {};
	for (const [index, cell] of band.cells.entries()) if (index >= target.at && cell.id !== carried.id) cells[cell.id] = carried.width + gap;
	const last = band.cells[band.cells.length - 1];
	const left = target.at < band.cells.length ? band.cells[target.at].left : last.right + gap;
	return { cells, bands: {}, slot: { left, top: band.top, width: carried.width, height: band.rowBottom - band.top } };
}

function partedAsRow(bands, target, carried, gap) {
	const shifted = {};
	for (const band of bands) if (band.from >= target.at) shifted[band.from] = carried.height + gap;
	const above = bands.filter((one) => one.from < target.at).at(-1);
	const top = above ? above.rowBottom + gap : bands[0].top;
	return { cells: {}, bands: shifted, slot: { left: bands[0].left, top, width: bands[0].width, height: carried.height } };
}

export function sameTarget(one, other) {
	if (!one || !other) return one === other;
	return one.kind === other.kind && one.at === other.at && one.row === other.row;
}

function snapped(px, inner) {
	const step = inner / LADDER;
	return Math.round(px / step) * step;
}
