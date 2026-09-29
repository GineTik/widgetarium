import { columnsOf, keptAt, leavesOf, movedInto, REGION_GAP_PX } from "../tree.js";

export function laidTree({ board, width, shared }, { carrying, insets }) {
	const root = board.layout;
	const drawn = carrying ? movedInto(root, carrying.id, carrying.target) : root;
	const { beside, floating, hidden, alone } = columnsOf(drawn, width, REGION_GAP_PX);
	const tileOf = (id) => board.tiles.find((tile) => tile.id === id);
	const widgetOf = (id) => tileOf(id)?.widget;
	const manifestOf = (id) => shared.registry.get(widgetOf(id))?.manifest;
	const placed = new Set(leavesOf(root).map((leaf) => leaf.id));
	const keep = keptAt(drawn);
	return {
		root,
		drawn,
		beside,
		floating,
		hidden,
		alone,
		keep,
		tileOf,
		manifestOf,
		ask: askOf({ widgetOf, manifestOf, insets }),
		unplaced: board.tiles.filter((tile) => !placed.has(tile.id)),
		// TRADE-OFF: a root with no `keep` child still stands (columnsOf answers `alone`), so the overlay falls to the first region drawn — unmounted it takes every ref its widgets publish with it
		overlayAt: keep >= 0 ? keep : (alone[0] ?? beside[0]?.at ?? null),
	};
}

function askOf({ widgetOf, manifestOf, insets }) {
	return (id) => {
		const manifest = manifestOf(id) ?? {};
		return {
			minPx: manifest.stackBelowPx ?? 0,
			preferred: manifest.preferredSize ?? null,
			widget: widgetOf(id),
			role: manifest.role,
			insets: insets[id],
		};
	};
}
