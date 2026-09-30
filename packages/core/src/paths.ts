export const ROOT = ".widgetarium";
export const WIDGETS_DIR = `${ROOT}/widgets`;
export const COMPONENTS_DIR = `${ROOT}/components`;
export const LOCK_PATH = `${ROOT}/widgets.lock.json`;

interface SizeClass {
	readonly name: "phone" | "tablet" | "desktop";
	readonly upTo: number;
	readonly scale: number;
}

interface GridMetrics {
	readonly columns: number;
	readonly scale: number;
	readonly cell: number;
	readonly gap: number;
	readonly pad: number;
	readonly boardWidth: number;
}

const WIDEST_CLASS: SizeClass = { name: "desktop", upTo: Infinity, scale: 1.1 };

const CLASSES: readonly SizeClass[] = [
	{ name: "phone", upTo: 599, scale: 0.95 },
	{ name: "tablet", upTo: 1023, scale: 1 },
	WIDEST_CLASS,
];

const MEDIUM_CONTROL_PX = 42;
const CONTROL_GUTTER_PX = 12;

export const GRID = {
	padPx: 8,
	minColumns: 3,
	cellPx: MEDIUM_CONTROL_PX + CONTROL_GUTTER_PX,
	gapPx: 8,
} as const;

export function scaleOf(sizeClass: SizeClass): number {
	return sizeClass.scale;
}

export function classOf(width: number): SizeClass {
	return CLASSES.find((entry) => width <= entry.upTo) ?? WIDEST_CLASS;
}

export function measureGrid(availableWidth: number): GridMetrics {
	const { padPx, minColumns, cellPx, gapPx } = GRID;
	const inner = Math.max(0, availableWidth - 2 * padPx);
	const columns = Math.max(minColumns, nearestColumnCount(inner, cellPx, gapPx));
	const wanted = columns * cellPx + (columns - 1) * gapPx;
	const scaleToFillPane = wanted > 0 ? inner / wanted : 1;
	return {
		columns,
		scale: scaleToFillPane,
		cell: cellPx * scaleToFillPane,
		gap: gapPx * scaleToFillPane,
		pad: padPx,
		boardWidth: inner,
	};
}

export function spanToPixels(cells: number, cell: number, gap: number): number {
	return cells * cell + (cells - 1) * gap;
}

function nearestColumnCount(innerWidth: number, cellPx: number, gapPx: number): number {
	return Math.round((innerWidth + gapPx) / (cellPx + gapPx));
}
