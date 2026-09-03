export const GAP_PX = 12;
export const HANDLE_PX = 14;
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
	return { id: cell.id, width, minPx: cell.minPx, height: cell.height ?? null };
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

export function restacked(row, wantedPx, capOf) {
	const tall = Math.max(MIN_HEIGHT_PX, Math.round(wantedPx));
	return row.map((cell) => {
		const cap = capOf(cell.id);
		return { ...cell, height: cap ? Math.min(tall, cap) : tall };
	});
}

function snapped(px, inner) {
	const step = inner / LADDER;
	return Math.round(px / step) * step;
}
