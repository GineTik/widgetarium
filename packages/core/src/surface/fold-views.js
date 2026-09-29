import { uniqueName, VIEW_GROUP } from "../model.js";
import { declaredName } from "../registry.js";
import {
	insertAt,
	isBox,
	keptAt,
	nodeAt,
	pathOfLeaf,
	prune,
	replaceAt,
	SWAP,
	swapBoxes,
	withoutLeaf,
} from "../tree.js";

const NO_BOX_FOR_THE_VIEWS = "Widgetarium: this board holds no box the views could stand in, so nothing was folded.";
const SEAT = "wg-seat";

export function viewTiles(tiles, registry) {
	return tiles.filter((tile) => registry.get(tile.widget)?.manifest?.view);
}

// TRADE-OFF: the tile standing first is marked before the others are taken out, because pruning moves every path behind it and the seat has to survive that
export function layoutWithSwap(layout, moved, box) {
	const stood = moved.map((tile) => pathOfLeaf(layout, tile.id)).find(Boolean);
	if (!stood) return seatBeside(layout, box);
	const emptied = moved.reduce((held, tile) => withoutLeaf(held, tile.id), replaceAt(layout, stood, { id: SEAT }));
	const seat = pathOfLeaf(emptied, SEAT);
	return seat ? prune(replaceAt(emptied, seat, box)) : seatBeside(emptied, box);
}

export function swapsStanding(layout) {
	return swapBoxes(layout)
		.filter((held) => held.box.id)
		.map((held) => ({ widget: VIEW_GROUP, id: held.box.id }));
}

export function swapOfViews(moved, registry, id) {
	const taken = new Set();
	return {
		dir: SWAP,
		id,
		of: moved.map((tile) => ({ id: tile.id, ratio: 1, name: uniqueName(taken, declaredName(registry, tile.widget)) })),
	};
}

export function mintTileId() {
	return `w${Math.random().toString(36).slice(2, 8)}`;
}

function seatBeside(layout, box) {
	const keep = keptAt(layout) >= 0 ? [keptAt(layout)] : firstBoxIn(layout);
	const seated = keep === null ? null : insertAt(layout, keep, nodeAt(layout, keep).of.length, box);
	if (seated) return seated;
	console.warn(NO_BOX_FOR_THE_VIEWS);
	return layout;
}

function firstBoxIn(root) {
	const at = root.of.findIndex(isBox);
	return at < 0 ? null : [at];
}
