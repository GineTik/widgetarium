import { createElement as h } from "react";
import { Button } from "@widgetarium/kit";
import { compatibility, movedTileProps } from "../engine/compatibility.js";
import { widgetKeyOf } from "../engine/widget-ref.js";

const NEWER_GENERATION = "A newer {widget} is installed; this tile still uses the version it was made with.";
const MOVE_TO_NEWER = "Move this tile to it";

export function newerGenerationNote(registry, tile, patchTile) {
	const newer = newerGenerationFor(registry, tile);
	if (!newer) return null;
	return h("div", { className: "wg-newer", key: "newer" }, [
		h("span", { key: "said" }, NEWER_GENERATION.replace("{widget}", widgetKeyOf(tile.widget))),
		h(
			Button,
			{ key: "move", size: "s", onClick: () => patchTile(tile.id, movedToNewer(registry, tile, newer)) },
			MOVE_TO_NEWER,
		),
	]);
}

function newerGenerationFor(registry, tile) {
	const held = registry.resolveId?.(tile.widget);
	const newest = registry.generationsOf?.(widgetKeyOf(tile.widget)).at(-1);
	if (!held || !newest || newest === held) return null;
	const verdict = compatibility(registry.get(held)?.manifest, registry.get(newest)?.manifest);
	return verdict.canMoveTiles ? { newest, verdict } : null;
}

function movedToNewer(registry, tile, newer) {
	return (now) =>
		now.widget === tile.widget
			? { widget: registry.tileRefOf(newer.newest), props: movedTileProps(now.props, newer.verdict) }
			: {};
}
