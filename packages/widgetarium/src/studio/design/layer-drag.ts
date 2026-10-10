export interface DragRow {
	readonly mark: string;
	readonly depth: number;
	readonly top: number;
	readonly height: number;
	readonly canHold: boolean;
	readonly isHeld: boolean;
	readonly scope: string;
}

export interface Projection {
	readonly at: number;
	readonly depth: number;
	readonly parent: string;
	readonly before: string | null;
	readonly block: readonly string[];
	readonly blockHeight: number;
	readonly slotTop: number;
	readonly isStill: boolean;
}

export interface Pointer {
	readonly y: number;
	readonly dx: number;
}

export function projectedDrop(
	rows: readonly DragRow[],
	dragged: string,
	pointer: Pointer,
	shownAt: number | null,
	indent: number,
): Projection | null {
	const from = rows.findIndex((row) => row.mark === dragged);
	const lifted = rows[from];
	if (!lifted) return null;
	const blockEnd = endOfBlock(rows, from);
	const block = rows.slice(from, blockEnd);
	const rest = [...rows.slice(0, from), ...rows.slice(blockEnd)];
	const blockHeight = block.reduce((sum, row) => sum + row.height, 0);
	const shift = { from, blockHeight, at: shownAt ?? from };
	const at = rest.filter((row, index) => shownTopOf(row, index, shift) + row.height / 2 < pointer.y).length;
	const placed = placedAt(rest, at, lifted.depth + Math.round(pointer.dx / indent), lifted.scope);
	if (!placed) return null;
	const before = siblingAfter(rest, at, placed.depth);
	return {
		at,
		depth: placed.depth,
		parent: placed.parent,
		before,
		block: block.map((row) => row.mark),
		blockHeight,
		slotTop: slotTopOf(rest, at, from, blockHeight),
		isStill:
			placed.parent === parentAbove(rows, from, lifted.depth)?.mark &&
			before === siblingAfter(rows, blockEnd, lifted.depth),
	};
}

export function shownTopOf(
	row: DragRow,
	index: number,
	shift: { from: number; blockHeight: number; at: number },
): number {
	const closedUp = index >= shift.from ? -shift.blockHeight : 0;
	const openedDown = index >= shift.at ? shift.blockHeight : 0;
	return row.top + closedUp + openedDown;
}

function slotTopOf(rest: readonly DragRow[], at: number, from: number, blockHeight: number): number {
	const next = rest[at];
	if (next) return next.top - (at >= from ? blockHeight : 0);
	const last = rest[rest.length - 1];
	return last ? last.top + last.height - (rest.length - 1 >= from ? blockHeight : 0) : 0;
}

function endOfBlock(rows: readonly DragRow[], from: number): number {
	const depth = rows[from]?.depth ?? 0;
	let end = from + 1;
	while ((rows[end]?.depth ?? -1) > depth) end += 1;
	return end;
}

function placedAt(
	rest: readonly DragRow[],
	at: number,
	wanted: number,
	scope: string,
): { depth: number; parent: string } | null {
	const above = rest[at - 1];
	if (!above) return null;
	const deepest = above.depth + (above.canHold ? 1 : 0);
	const shallowest = rest[at]?.depth ?? 0;
	for (let depth = Math.min(deepest, Math.max(shallowest, wanted)); depth >= shallowest; depth -= 1) {
		const parent = parentAbove(rest, at, depth);
		if (parent?.canHold && parent.scope === scope) return { depth, parent: parent.mark };
	}
	return null;
}

function parentAbove(rows: readonly DragRow[], at: number, depth: number): DragRow | null {
	for (let index = at - 1; index >= 0; index -= 1) {
		const row = rows[index];
		if (row && row.depth === depth - 1) return row;
		if (row && row.depth < depth - 1) return null;
	}
	return null;
}

function siblingAfter(rows: readonly DragRow[], at: number, depth: number): string | null {
	for (let index = at; index < rows.length; index += 1) {
		const row = rows[index];
		if (!row || row.depth < depth) return null;
		if (row.depth === depth && !row.isHeld) return row.mark;
	}
	return null;
}
