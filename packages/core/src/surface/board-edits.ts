import { wireTiles } from "../engine/wiring.js";
import type { Board, Tile } from "../model.js";
import { isTile } from "../board-tiles.js";
import type { TabRow } from "../tab-rows.js";
import type { TilePatch } from "../settings/settings-state.js";
import { insertAt, isBox, leavesOf, nodeAt, pathKey, withHolds, withoutLeaf } from "../tree.js";
import type { BoxNode, NodePath } from "../tree.js";
import { mintTileId, layoutWithSwap, swapOfViews, swapsStanding, viewTiles } from "./fold-views.js";
import type { MovedTile } from "./newer-generation.js";
import type { BoardRegistry } from "./use-surface-shared.js";

const NO_VIEWS_TO_FOLD =
	"Widgetarium: this board holds no widget that names itself a view, so there was nothing to fold.";
const NO_BOX_TO_ADD_INTO =
	'Widgetarium: the widget was not added — no box stands at "{path}" on this board any more, so the pick had nowhere to go';

export type CommitLayout = (change: (held: BoxNode) => BoxNode) => void;

type TileFields = TilePatch | MovedTile;

export type TileChange = TileFields | ((now: Tile) => TileFields);

export type PatchTile = (id: string, change: TileChange) => void;

export interface BoardEdits {
	readonly commitLayout: CommitLayout;
	readonly commitHolds: (path: NodePath, rows: readonly TabRow[]) => void;
	readonly patchTile: PatchTile;
	readonly removeTile: (id: string) => void;
	readonly addTileInto: (widgetId: string, path: NodePath) => void;
	readonly foldIntoGroup: () => boolean;
}

interface BoardEditsAsk {
	readonly boardAsItStands: () => Board;
	readonly onChange: (next: Board, isCommit: boolean) => void;
	readonly registry: BoardRegistry;
}

type BoardChange = (now: Board) => Board | null;

export function boardEdits({ boardAsItStands, onChange, registry }: BoardEditsAsk): BoardEdits {
	// TRADE-OFF: a transform answering nothing writes nothing, so a refusal needs no second entrance to the file
	const commitBoard = (change: BoardChange): void => {
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
		foldIntoGroup: () => foldIntoGroup(commitBoard, registry),
	};
}

function boardWithHolds(board: Board, path: NodePath, rows: readonly TabRow[]): Board {
	const layout = withHolds(board.layout, path, rows);
	const kept = new Set(leavesOf(layout).map((leaf) => leaf.id));
	const gone = leavesOf(nodeAt(board.layout, path)).filter((leaf) => !kept.has(leaf.id));
	const dropped = new Set(gone.map((leaf) => leaf.id));
	return { ...board, tiles: board.tiles.filter((tile) => !dropped.has(tile.id)), layout };
}

// TRADE-OFF: a patched tile is checked at its top level only; nested records stay as written until normalizeBoard reads them back
function withTilePatched(board: Board, id: string, patch: TileChange): Board {
	const patched = (tile: Tile): Tile => {
		const merged = { ...tile, ...(typeof patch === "function" ? patch(tile) : patch) };
		return isTile(merged) ? merged : tile;
	};
	return { ...board, tiles: board.tiles.map((tile) => (tile.id === id ? patched(tile) : tile)) };
}

function withoutTile(board: Board, id: string): Board {
	return { ...board, tiles: board.tiles.filter((tile) => tile.id !== id), layout: withoutLeaf(board.layout, id) };
}

function withTileAdded(board: Board, widgetId: string, path: NodePath, registry: BoardRegistry): Board | null {
	const box = nodeAt(board.layout, path);
	if (!isBox(box)) {
		console.warn(NO_BOX_TO_ADD_INTO.replace("{path}", pathKey(path)));
		return null;
	}
	const { id, tiles } = createTile(board, widgetId, registry);
	const layout = insertAt(board.layout, path, box.of.length, { id, ratio: 1 });
	return layout ? { ...board, tiles, layout } : null;
}

function createTile(board: Board, widgetId: string, registry: BoardRegistry): { id: string; tiles: Tile[] } {
	const id = mintTileId();
	const widget = registry.tileRefOf?.(widgetId) ?? widgetId;
	return { id, tiles: wireTiles([...board.tiles, tileOf(id, widget)], registry, swapsStanding(board.layout)) };
}

function tileOf(id: string, widget: string): Tile {
	return { id, widget, settings: {}, mounts: {}, props: {}, slots: {}, mounted: {} };
}

function foldIntoGroup(commitBoard: (change: BoardChange) => void, registry: BoardRegistry): boolean {
	let folded = false;
	commitBoard((now) => {
		const moved = viewTiles(now.tiles, registry);
		if (moved.length === 0) return null;
		folded = true;
		const layout = layoutWithSwap(now.layout, moved, swapOfViews(moved, registry, mintTileId()));
		return { ...now, tiles: wireTiles(now.tiles, registry, swapsStanding(layout)), layout };
	});
	if (!folded) console.warn(NO_VIEWS_TO_FOLD);
	return folded;
}
