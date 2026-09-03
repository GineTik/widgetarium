export const GAP_PX = 12;
export const LADDER = 12;
export const MIN_HEIGHT_PX = 80;

// TODO: column groups inside a row — no board needs one yet
export function layTree(rows, width, gap = GAP_PX) {
	return rows.flatMap((row, from) => laidRow(row, from, width, gap));
}

function laidRow(row, from, width, gap) {
	const inner = innerOf(row.length, width, gap);
	const shares = sharesOf(row);
	if (row.some((cell, at) => inner * shares[at] < cell.minPx)) return row.map((cell) => ({ from, cells: [sized(cell, width)] }));
	return [{ from, cells: row.map((cell, at) => sized(cell, inner * shares[at])) }];
}

export function innerOf(cells, width, gap = GAP_PX) {
	return width - gap * (cells - 1);
}

function sharesOf(row) {
	const total = row.reduce((sum, cell) => sum + cell.ratio, 0);
	return row.map((cell) => cell.ratio / total);
}

function sized(cell, width) {
	return { id: cell.id, width, minPx: cell.minPx };
}

export function resized(row, at, boundaryPx, inner, isFree) {
	const total = row.reduce((sum, cell) => sum + cell.ratio, 0);
	const pxOf = (cell) => (inner * cell.ratio) / total;
	const before = row.slice(0, at).reduce((sum, cell) => sum + pxOf(cell), 0);
	const pair = pxOf(row[at]) + pxOf(row[at + 1]);
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

function snapped(px, inner) {
	const step = inner / LADDER;
	return Math.round(px / step) * step;
}
