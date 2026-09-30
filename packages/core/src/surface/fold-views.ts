import { uniqueName, VIEW_GROUP } from "../model.js";
import type { Tile } from "../model.js";
import { declaredName } from "../registry.js";
import type { WidgetLookup } from "../registry.js";
import type { StandingTile } from "../engine/wiring.js";
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
import type { BoxNode, LeafNode, NodePath } from "../tree.js";

const NO_BOX_FOR_THE_VIEWS = "Widgetarium: this board holds no box the views could stand in, so nothing was folded.";
const SEAT = "wg-seat";

export function viewTiles(tiles: readonly Tile[], registry: WidgetLookup): Tile[] {
	return tiles.filter((tile) => registry.get(tile.widget)?.manifest?.["view"]);
}

// TRADE-OFF: the tile standing first is marked before the others are taken out, because pruning moves every path behind it and the seat has to survive that
export function layoutWithSwap(layout: BoxNode, moved: readonly Tile[], box: BoxNode): BoxNode {
	const stood = moved.map((tile) => pathOfLeaf(layout, tile.id)).find(Boolean);
	if (!stood) return seatBeside(layout, box);
	const emptied = moved.reduce((held, tile) => withoutLeaf(held, tile.id), seated(layout, stood, { id: SEAT }));
	const seat = pathOfLeaf(emptied, SEAT);
	return seat ? prune(seated(emptied, seat, box)) : seatBeside(emptied, box);
}

export function swapsStanding(layout: BoxNode): StandingTile[] {
	return swapBoxes(layout).flatMap((held) => (held.box.id ? [{ widget: VIEW_GROUP, id: held.box.id }] : []));
}

export function swapOfViews(moved: readonly Tile[], registry: WidgetLookup, id: string): BoxNode {
	const taken = new Set<string>();
	return {
		dir: SWAP,
		id,
		of: moved.map((tile) => ({ id: tile.id, ratio: 1, name: uniqueName(taken, declaredName(registry, tile.widget)) })),
	};
}

export function mintTileId(): string {
	return `w${Math.random().toString(36).slice(2, 8)}`;
}

function seated(layout: BoxNode, path: NodePath, node: BoxNode | LeafNode): BoxNode {
	const replaced = replaceAt(layout, path, node);
	return isBox(replaced) ? replaced : layout;
}

function seatBeside(layout: BoxNode, box: BoxNode): BoxNode {
	const keep = keptAt(layout) >= 0 ? [keptAt(layout)] : firstBoxIn(layout);
	const holder = keep === null ? null : nodeAt(layout, keep);
	const placed = keep !== null && isBox(holder) ? insertAt(layout, keep, holder.of.length, box) : null;
	if (placed) return placed;
	console.warn(NO_BOX_FOR_THE_VIEWS);
	return layout;
}

function firstBoxIn(root: BoxNode): NodePath | null {
	const at = root.of.findIndex(isBox);
	return at < 0 ? null : [at];
}
