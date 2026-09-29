import { useSettingsWindow } from "../settings-window.js";
import { saidRefusal, surfaceChoicesAt, widgetOfTiles, wearSurfaceAt } from "../surface-laws.js";
import { NO_SURFACE, nodeAt, pathOfLeaf } from "../tree.js";
import { treeCellBody } from "./tree-cell-body.js";

const TREE_PLACE = { x: 0, y: 0, w: 1, h: 1 };

export function TreeSettings({ session, tile, canvasBox, entryPath, shared, patchTile, board, commitLayout, frame }) {
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
		place: { ...TREE_PLACE, id: tile.id },
		widget: treeCellBody({ tile, definition, shared, cell: { width: canvasBox.width }, patchTile }),
	});
	return settingsWindow.dialog;
}

function surfaceOfTile({ layout, tiles }, id, commitLayout, host) {
	const widgetOf = widgetOfTiles(tiles);
	const path = pathOfLeaf(layout, id);
	if (!path) return null;
	const node = nodeAt(layout, path);
	const wear = (surface, side) =>
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
