import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import { compatibility, moveTileProps } from "../engine/compatibility.js";
import type { Compatibility } from "../engine/compatibility.js";
import type { Fields } from "../engine/catalogue-index.js";
import { widgetKeyOf } from "../engine/widget-ref.js";
import type { Tile } from "../model.js";
import type { SurfaceRegistry } from "./use-surface-shared.js";

const NEWER_GENERATION = "A newer {widget} is installed; this tile still uses the version it was made with.";
const MOVE_TO_NEWER = "Move this tile to it";

export interface GenerationRegistry extends SurfaceRegistry {
	resolveId?(id: string): string | null | undefined;
	generationsOf?(key: string): readonly string[];
	tileRefOf(id: string): string;
}

export interface MovedTile {
	readonly widget?: string;
	readonly props?: Fields;
}

export type PatchTile = (id: string, patch: (now: Pick<Tile, "widget" | "props">) => MovedTile) => void;

interface NewerGeneration {
	readonly newest: string;
	readonly verdict: Compatibility;
}

export function newerGenerationNote(
	registry: GenerationRegistry,
	tile: Pick<Tile, "id" | "widget">,
	patchTile: PatchTile,
): ReactElement | null {
	const newer = newerGenerationFor(registry, tile);
	if (!newer) return null;
	return h("div", { className: "wg-newer", key: "newer" }, [
		h("span", { key: "said" }, NEWER_GENERATION.replace("{widget}", widgetKeyOf(tile.widget))),
		h(
			Button,
			{ key: "move", size: "s", onClick: () => patchTile(tile.id, moveToNewer(registry, tile, newer)) },
			MOVE_TO_NEWER,
		),
	]);
}

function newerGenerationFor(registry: GenerationRegistry, tile: Pick<Tile, "widget">): NewerGeneration | null {
	const held = registry.resolveId?.(tile.widget);
	const generations = registry.generationsOf?.(widgetKeyOf(tile.widget)) ?? [];
	const newest = generations[generations.length - 1];
	if (!held || !newest || newest === held) return null;
	const verdict = compatibility(registry.get(held)?.manifest, registry.get(newest)?.manifest);
	return verdict.canMoveTiles ? { newest, verdict } : null;
}

function moveToNewer(
	registry: GenerationRegistry,
	tile: Pick<Tile, "widget">,
	newer: NewerGeneration,
): (now: Pick<Tile, "widget" | "props">) => MovedTile {
	return (now) =>
		now.widget === tile.widget
			? { widget: registry.tileRefOf(newer.newest), props: moveTileProps(now.props, newer.verdict) }
			: {};
}
