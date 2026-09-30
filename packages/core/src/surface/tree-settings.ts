import type { ReactElement } from "react";
import { useSettingsWindow } from "../settings-window.js";
import type { SettingsWindowAsk } from "../settings-window.js";
import { saidRefusal, surfaceChoicesAt, widgetOfTiles, wearSurfaceAt } from "../surface-laws.js";
import { NO_SURFACE, nodeAt, pathOfLeaf } from "../tree.js";
import type { Board, Tile } from "../model.js";
import type { MountStep } from "../settings/use-settings-look.js";
import type { TileSurface } from "../settings/surface-group.js";
import type { CommitLayout, PatchTile } from "./board-edits.js";
import type { CellSize } from "./tile-actions.js";
import { treeCellBody } from "./tree-cell-body.js";
import type { SurfaceShared } from "./use-surface-shared.js";

const TREE_PLACE = { w: 1, h: 1 };

type SettingsFrame = Pick<
	SettingsWindowAsk,
	"host" | "registry" | "refs" | "cell" | "gap" | "phone" | "columns" | "countReaders" | "onDone" | "onDismiss"
>;

export interface TreeSettingsProps {
	readonly session: string;
	readonly tile: Tile;
	readonly canvasBox: CellSize;
	readonly entryPath: readonly MountStep[] | null;
	readonly shared: SurfaceShared;
	readonly patchTile: PatchTile;
	readonly board: Board;
	readonly commitLayout: CommitLayout;
	readonly frame: SettingsFrame;
}

export function TreeSettings({
	session,
	tile,
	canvasBox,
	entryPath,
	shared,
	patchTile,
	board,
	commitLayout,
	frame,
}: TreeSettingsProps): ReactElement | null {
	const definition = shared.registry.get(tile.widget);
	const settingsWindow = useSettingsWindow({
		...frame,
		session,
		definition,
		tile,
		canvasBox,
		entryPath,
		onPatch: (patch) => patchTile(tile.id, patch),
		surface: surfaceOfTile(board, tile.id, commitLayout, frame.host),
		place: TREE_PLACE,
		widget: treeCellBody({ tile, definition, shared, cell: { width: canvasBox.width }, patchTile }),
	});
	return settingsWindow.dialog;
}

function surfaceOfTile(
	{ layout, tiles }: Board,
	id: string,
	commitLayout: CommitLayout,
	host: SettingsFrame["host"],
): TileSurface | null {
	const widgetOf = widgetOfTiles(tiles);
	const path = pathOfLeaf(layout, id);
	if (!path) return null;
	const node = nodeAt(layout, path);
	const wear: TileSurface["wear"] = (surface, side) =>
		commitLayout((now) => {
			const { layout: next, refusal } = wearSurfaceAt(now, path, surface, side, widgetOf);
			if (refusal) host?.ui?.notify?.(saidRefusal(refusal));
			return next;
		});
	return {
		now: node?.surface ?? NO_SURFACE,
		side: node?.side ?? null,
		choices: () => surfaceChoicesAt(layout, path, widgetOf),
		wear,
	};
}
