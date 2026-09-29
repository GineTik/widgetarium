import { createElement as h } from "react";
import { platesAtCell, PLATES_ABOVE } from "@widgetarium/kit/surface";
import { rekey } from "../model.js";
import { DrawnInShell } from "../mounted.js";
import { behindBoundary } from "./behind-boundary.js";
import { isDrawable } from "./is-drawable.js";
import { failedTile, missingTile } from "./missing-tile.js";
import { newerGenerationNote } from "./newer-generation.js";
import { resolvePatch } from "./resolve-patch.js";
import { WidgetHost } from "./widget-host.js";

export function treeCellBody({ tile, definition, shared, cell, patchTile, editing, onOpenSettings }) {
	if (!definition) return missingTile(tile, shared.host);
	if (!isDrawable(definition)) return failedTile(tile, definition);
	const onPatch = (patch) => patchTile(tile.id, patch);
	const place = { id: tile.id, x: 0, y: 0, w: cell.width, h: 1 };
	const enterMount = editing && onOpenSettings ? (steps) => onOpenSettings(tile.id, null, steps) : null;
	const drawn = drawTile(
		shared.shells,
		tile,
		h(
			PLATES_ABOVE.Provider,
			{ value: platesAtCell(cell) },
			h(WidgetHost, { ...shared, ...widgetPatchers(tile, onPatch), definition, tile, place, onPatch, enterMount }),
		),
	);
	const note = editing ? newerGenerationNote(shared.registry, tile, patchTile) : null;
	return note ? [note, drawn] : drawn;
}

function drawTile(shells, tile, child) {
	return h(DrawnInShell, { shell: shells.shellFor(tile.id), tree: behindBoundary(tile.widget, child) });
}

function widgetPatchers(tile, onPatch) {
	return {
		patchProp: (name, patch) =>
			onPatch((now) => ({ props: { ...(now.props ?? {}), [name]: resolvePatch(now.props?.[name] ?? {}, patch) } })),
		patchMounted: (name, was, patch) => onPatch({ mounted: rekey(tile.mounted, name, was, patch) }),
	};
}
