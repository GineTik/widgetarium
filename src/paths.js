export const ROOT = ".widgetarium";
export const WIDGETS_DIR = `${ROOT}/widgets`;
export const COMPONENTS_DIR = `${ROOT}/components`;

// three authored layouts, each with a fixed column count.
// the cell is always square and grows with the board, so a layout scales without reflowing.
// scale belongs to the class, not to the cell. Tie it to the cell and the type size
// jumps by the ratio of the column counts every time a breakpoint is crossed —
// measured at 12 -> 20 columns that was 22.4px -> 13.8px on one pixel of width.
// A 1x1 cell is a button, so it may never fall under the finger: Apple asks 44pt,
// Material 48dp. The column count is derived from the width against one target cell,
// which keeps the cell near that target at every size instead of letting a fixed count
// stretch it — seven columns put the phone cell at 37.9px on a 393px screen.
// A class no longer carries a column count. It carries the things that really are a
// property of the device: how far the screen sits from the eye (scale), how tight the
// gutter may be, and the width to preview it at.
export const CLASSES = [
	{ name: "phone", upTo: 599, scale: 0.95 },
	{ name: "tablet", upTo: 1023, scale: 1 },
	{ name: "desktop", upTo: Infinity, scale: 1.1 },
];

// The cell a board aims for. Larger on a narrow screen and smaller on a wide one, because
// the two are constrained by different things: a phone shows FEW cells and every one of
// them is a finger target, a monitor shows MANY and the pointer is precise. Interpolated
// across the range rather than stepped per class — a step would resize the whole board on
// one pixel of width, the same cliff the per-class type scale already taught us to avoid.
export const GRID = {
	padPx: 16,
	minColumns: 3,
	targetCellNarrowPx: 84,
	targetCellWidePx: 68,
	// the gutter travels with the target. Held per class it stepped 8 -> 16 at 600px, and
	// a wider window then fitted FEWER columns than a narrower one — the board reflowed
	// backwards as it grew.
	gapNarrowPx: 8,
	gapWidePx: 16,
	narrowWidthPx: 390,
	wideWidthPx: 1100,
};

function alongWidth(width) {
	const { narrowWidthPx, wideWidthPx } = GRID;
	return Math.max(0, Math.min(1, (width - narrowWidthPx) / (wideWidthPx - narrowWidthPx)));
}

function targetCellFor(width) {
	const { targetCellNarrowPx, targetCellWidePx } = GRID;
	return targetCellNarrowPx + (targetCellWidePx - targetCellNarrowPx) * alongWidth(width);
}

// deliberately fractional: rounding the gutter made one extra column stop fitting at a
// single width, so a wider window reflowed to FEWER columns. Tiles and cells are both
// placed from this same number, so they stay aligned on a subpixel value.
function gapFor(width) {
	const { gapNarrowPx, gapWidePx } = GRID;
	return gapNarrowPx + (gapWidePx - gapNarrowPx) * alongWidth(width);
}

// One scale for the whole board, and it only moves when the class does. Within a class
// the cell breathes while the type holds still, so a widget given more room adapts
// instead of inflating.
export function scaleOf(sizeClass) {
	return sizeClass.scale;
}

export function classOf(width) {
	return CLASSES.find((entry) => width <= entry.upTo) ?? CLASSES[CLASSES.length - 1];
}

export function measureGrid(availableWidth) {
	const { padPx, minColumns } = GRID;
	const gapPx = gapFor(availableWidth);
	const inner = Math.max(0, availableWidth - 2 * padPx);
	// round, not floor: floor always overshoots the target, which widens the sawtooth the
	// cell rides as a column is added. Rounding picks the count landing nearest the target.
	const target = targetCellFor(availableWidth);
	const columns = Math.max(minColumns, Math.round((inner + gapPx) / (target + gapPx)));
	// the cell absorbs the remainder, so the board is exactly the width it was given:
	// no ceiling, therefore no dead margin and nothing to overflow
	const cell = (inner - (columns - 1) * gapPx) / columns;
	return { columns, cell, gap: gapPx, pad: padPx, boardWidth: inner };
}
