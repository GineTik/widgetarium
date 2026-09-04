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

// THE CELL IS A SUM, NOT A PREFERENCE. A control is 42px tall and a widget pads it by 12 on
// each side, so a widget one cell tall has to hold 42 + 12 + 12 = 66. Anything above that is
// slack the widget cannot use; anything below it and the control does not fit its own cell.
// Change the control height or the padding and this number moves with them.
//
// It was elastic before — a target interpolated from 84 down to 68 — and the cell it produced
// ranged from 65 to 93px depending on the pane. That is the whole reason the drawings and the
// grid disagreed: no single size existed to draw against. The board still fills its pane
// exactly, but by scaling this one number a few percent rather than by inventing a new size,
// so there is always a number to draw against and a multiplier that says how far off it is.
// A user-set scale later multiplies the same number and nothing else changes.
export const GRID = {
	padPx: 8,
	minColumns: 3,
	// CONTEXT: one cell is one medium control (42) plus one gutter (12) — at 66 a control
	// filled two thirds of its cell and every 1x1 tile read as a button lost inside a hole
	cellPx: 54,
	gapPx: 8,
};

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
	const { padPx, minColumns, cellPx, gapPx } = GRID;
	const inner = Math.max(0, availableWidth - 2 * padPx);
	// ROUND, not floor: the column count nearest the pane is the one whose scale is nearest 1.
	// Flooring always left a rag and never asked for less than a whole column.
	const columns = Math.max(minColumns, Math.round((inner + gapPx) / (cellPx + gapPx)));
	const wanted = columns * cellPx + (columns - 1) * gapPx;
	// ONE NUMBER IN THE DESIGN, ONE MULTIPLIER ON THE SCREEN. The cell is 66 everywhere a
	// person reasons about it; the board then scales by a few percent so the columns land
	// exactly on the pane's edge. That is how a fixed size and a full fill hold at once —
	// the alternative was a rag of up to 77px, or an elastic cell nobody could draw against.
	const scale = wanted > 0 ? inner / wanted : 1;
	return {
		columns,
		scale,
		cell: cellPx * scale,
		gap: gapPx * scale,
		pad: padPx,
		boardWidth: inner,
	};
}
