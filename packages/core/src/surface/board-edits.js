import { wiredTiles } from "../engine/wiring.js";
import { insertedAt, isBox, leavesOf, nodeAt, pathKey, withHolds, withoutLeaf } from "../tree.js";
import { bornTileId, layoutWithSwap, swapOfViews, swapsStanding, viewTiles } from "./fold-views.js";

const NO_VIEWS_TO_FOLD =
	"Widgetarium: this board holds no widget that names itself a view, so there was nothing to fold.";
const NO_BOX_TO_ADD_INTO =
	'Widgetarium: the widget was not added — no box stands at "{path}" on this board any more, so the pick had nowhere to go';

export function boardEdits({ boardAsItStands, onChange, registry }) {
	// TRADE-OFF: a transform answering nothing writes nothing, so a refusal needs no second entrance to the file
	const commitBoard = (change) => {
		const next = change(boardAsItStands());
		if (next) onChange(next, true);
	};
	return {
		commitLayout: (change) => commitBoard((now) => ({ ...now, layout: change(now.layout) })),
		// TRADE-OFF: the rows and the tiles under them move in one write, because a deleted view whose tiles stayed on the board would keep drawing them in the overlay nobody can see
		commitHolds: (path, rows) => commitBoard((now) => boardWithHolds(now, path, rows)),
		patchTile: (id, patch) => commitBoard((now) => withTilePatched(now, id, patch)),
		removeTile: (id) => commitBoard((now) => withoutTile(now, id)),
		addTileInto: (widgetId, path) => commitBoard((now) => withTileAdded(now, widgetId, path, registry)),
		foldIntoGroup: () => foldedIntoGroup(commitBoard, registry),
	};
}

function boardWithHolds(board, path, rows) {
	const layout = withHolds(board.layout, path, rows);
	const kept = new Set(leavesOf(layout).map((leaf) => leaf.id));
	const gone = leavesOf(nodeAt(board.layout, path)).filter((leaf) => !kept.has(leaf.id));
	const dropped = new Set(gone.map((leaf) => leaf.id));
	return { ...board, tiles: board.tiles.filter((tile) => !dropped.has(tile.id)), layout };
}

function withTilePatched(board, id, patch) {
	const patched = (tile) => ({ ...tile, ...(typeof patch === "function" ? patch(tile) : patch) });
	return { ...board, tiles: board.tiles.map((tile) => (tile.id === id ? patched(tile) : tile)) };
}

function withoutTile(board, id) {
	return { ...board, tiles: board.tiles.filter((tile) => tile.id !== id), layout: withoutLeaf(board.layout, id) };
}

function withTileAdded(board, widgetId, path, registry) {
	const box = nodeAt(board.layout, path);
	if (!isBox(box)) {
		console.warn(NO_BOX_TO_ADD_INTO.replace("{path}", pathKey(path)));
		return null;
	}
	const { id, tiles } = bornTile(board, widgetId, registry);
	return { ...board, tiles, layout: insertedAt(board.layout, path, box.of.length, { id, ratio: 1 }) };
}

function bornTile(board, widgetId, registry) {
	const id = bornTileId();
	const widget = registry.tileRefOf?.(widgetId) ?? widgetId;
	return { id, tiles: wiredTiles([...board.tiles, { id, widget }], registry, swapsStanding(board.layout)) };
}

function foldedIntoGroup(commitBoard, registry) {
	let folded = false;
	commitBoard((now) => {
		const moved = viewTiles(now.tiles, registry);
		if (moved.length === 0) return null;
		folded = true;
		const layout = layoutWithSwap(now.layout, moved, swapOfViews(moved, registry, bornTileId()));
		return { ...now, tiles: wiredTiles(now.tiles, registry, swapsStanding(layout)), layout };
	});
	if (!folded) console.warn(NO_VIEWS_TO_FOLD);
	return folded;
}
