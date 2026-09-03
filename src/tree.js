export const GAP_PX = 12;

// TODO: column groups inside a row — no board needs one yet
export function layTree(rows, width, gap = GAP_PX) {
	return rows.flatMap((row) => laidRow(row, width, gap));
}

function laidRow(row, width, gap) {
	const inner = width - gap * (row.length - 1);
	const shares = sharesOf(row);
	if (row.some((cell, at) => inner * shares[at] < cell.minPx)) return row.map((cell) => [sized(cell, width)]);
	return [row.map((cell, at) => sized(cell, inner * shares[at]))];
}

function sharesOf(row) {
	const total = row.reduce((sum, cell) => sum + cell.ratio, 0);
	return row.map((cell) => cell.ratio / total);
}

function sized(cell, width) {
	return { id: cell.id, width, minPx: cell.minPx };
}
