import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { platesAtCell, PLATES_ABOVE } from "@widgetarium/kit/surface";
import { rekey } from "../model.js";
import type { Tile } from "../model.js";
import type { WidgetDefinition } from "../registry.js";
import { DrawnInShell } from "../mounted.js";
import type { TileShells } from "../engine/tile-shells.js";
import type { PatchStep } from "../engine/host-gateways.js";
import type { TilePatch } from "../settings/settings-state.js";
import type { LaidLeaf } from "../tree-laid.js";
import { behindBoundary } from "./behind-boundary.js";
import type { PatchTile, TileChange } from "./board-edits.js";
import { isDrawable } from "./is-drawable.js";
import { failedTile, missingTile } from "./missing-tile.js";
import { newerGenerationNote } from "./newer-generation.js";
import { resolvePatch } from "./resolve-patch.js";
import type { SettingsSession } from "./use-settings-session.js";
import type { PatchMounted, SurfaceShared } from "./use-surface-shared.js";
import { WidgetHost } from "./widget-host.js";
import type { EnterMount } from "./widget-host.js";

type CellBox = Pick<LaidLeaf, "width"> & Partial<Pick<LaidLeaf, "plates" | "underSurface">>;

interface CellBodyAsk {
	readonly tile: Tile;
	readonly definition: WidgetDefinition | null | undefined;
	readonly shared: SurfaceShared;
	readonly cell: CellBox;
	readonly patchTile: PatchTile;
	readonly editing?: boolean | undefined;
	readonly onOpenSettings?: SettingsSession["open"] | null | undefined;
}

interface WidgetPatchers {
	readonly patchProp: (name: string, step: PatchStep) => void;
	readonly patchMounted: PatchMounted;
}

export function treeCellBody({
	tile,
	definition,
	shared,
	cell,
	patchTile,
	editing,
	onOpenSettings,
}: CellBodyAsk): ReactNode {
	if (!definition) return missingTile(tile, shared.host);
	if (!isDrawable(definition)) return failedTile(tile, definition);
	const onPatch = (patch: TileChange): void => patchTile(tile.id, patch);
	const place = { id: tile.id, x: 0, y: 0, w: cell.width, h: 1 };
	const enterMount: EnterMount | null =
		editing && onOpenSettings ? (steps) => onOpenSettings(tile.id, null, steps) : null;
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

function drawTile(shells: TileShells, tile: Tile, child: ReactNode): ReactElement {
	return h(DrawnInShell, { shell: shells.shellFor(tile.id), tree: behindBoundary(tile.widget, child) });
}

function widgetPatchers(tile: Tile, onPatch: (patch: TileChange) => void): WidgetPatchers {
	return {
		patchProp: (name, patch) =>
			onPatch((now): TilePatch => ({
				props: { ...(now.props ?? {}), [name]: resolvePatch(now.props?.[name] ?? {}, patch) },
			})),
		patchMounted: (name, was, patch) => onPatch({ mounted: rekey<TilePatch>(tile.mounted, name, was, patch) }),
	};
}
