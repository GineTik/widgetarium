// WHEN A TILE IS TOO NARROW TO BE ITSELF.
//
// The old answer was to refuse the width, and the board's only way to honour a refusal was to
// drop the tile to the next row — half the screen appeared to vanish, and the developer who
// wrote the feature did not recognise it as intended. So the tile takes whatever width it is
// given, and below the point where even a compact design stops being readable the widget
// draws a CHIP: its own icon, its own name, and an affordance to open.
//
// This is the Priority+ pattern — what does not fit hides behind an "open" rather than
// breaking the row — joined to Material's container transform: the chip does not summon a
// dialog beside itself, it BECOMES the panel, growing from where it already sits so the
// connection between the two is never broken.

const CHIP_MARGIN_PX = 8;

export function isTooNarrow(widthPx, manifest) {
	const floor = manifest?.collapseBelowPx;
	return typeof floor === "number" && widthPx > 0 && widthPx < floor;
}

// Where the opened panel goes: anchored on the chip, grown to the size the widget wants, and
// pushed back inside the board rather than off its edge. A chip against the left wall opens
// to the right; one in the middle opens both ways.
export function openedBox(chip, wanted, board) {
	const width = Math.min(wanted.width, board.width - 2 * CHIP_MARGIN_PX);
	const height = Math.min(wanted.height, board.height - 2 * CHIP_MARGIN_PX);

	const centreLeft = chip.left + chip.width / 2 - width / 2;
	const centreTop = chip.top + chip.height / 2 - height / 2;

	return {
		left: clamp(centreLeft, CHIP_MARGIN_PX, board.width - width - CHIP_MARGIN_PX),
		top: clamp(centreTop, CHIP_MARGIN_PX, board.height - height - CHIP_MARGIN_PX),
		width,
		height,
	};
}

// The size an opened widget asks for: enough to clear its own chip threshold, and never more
// than the board has.
export function wantedBox(manifest, board) {
	const width = Math.max(manifest?.collapseBelowPx ?? 240, 320);
	const cells = manifest?.defaultSize ?? { w: 4, h: 4 };
	return {
		width: Math.min(width * 1.4, board.width - 2 * CHIP_MARGIN_PX),
		height: Math.min(Math.max(cells.h * 48, 240), board.height - 2 * CHIP_MARGIN_PX),
	};
}

function clamp(value, low, high) {
	return Math.max(low, Math.min(value, Math.max(low, high)));
}
