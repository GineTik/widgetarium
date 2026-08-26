export const ROOT = ".widgetarium";
export const WIDGETS_DIR = `${ROOT}/widgets`;
export const COMPONENTS_DIR = `${ROOT}/components`;

// three authored layouts, each with a fixed column count.
// the cell is always square and grows with the board, so a layout scales without reflowing.
export const CLASSES = [
	{ name: "phone", label: "Phone", upTo: 599, columns: 7 },
	{ name: "tablet", label: "Tablet", upTo: 1023, columns: 12 },
	{ name: "desktop", label: "Desktop", upTo: Infinity, columns: 20 },
];

export const GRID = { gapPx: 12, padPx: 12, minCellPx: 22 };

export function classOf(width) {
	return CLASSES.find((entry) => width <= entry.upTo) ?? CLASSES[CLASSES.length - 1];
}

export function measureGrid(availableWidth, columns) {
	const { gapPx, padPx, minCellPx } = GRID;
	const inner = Math.max(0, availableWidth - 2 * padPx);
	const cell = Math.max(minCellPx, (inner - (columns - 1) * gapPx) / columns);
	return {
		columns,
		cell,
		gap: gapPx,
		pad: padPx,
		boardWidth: columns * cell + (columns - 1) * gapPx,
	};
}
