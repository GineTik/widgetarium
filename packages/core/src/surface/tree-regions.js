import { createElement as h } from "react";
import { laidRegion, sideOf } from "../tree.js";
import { plateVars, regionSurfaceAttrs } from "./node-style.js";
import { TreeRegion } from "./tree-region.js";

export function regionsOf(context, page, laid) {
	const laidCache = new Map();
	const placedOf = (at, given, isFloating) => {
		const key = `${at}:${given}:${isFloating}`;
		if (!laidCache.has(key))
			laidCache.set(
				key,
				laidRegion(laid.drawn, at, given, { ask: laid.ask, isFloating, viewportPx: window.innerWidth }),
			);
		return laidCache.get(key);
	};
	const region = (at, given, isFloating = false) =>
		regionElement({ context, page, laid, at, given, isFloating, placed: placedOf(at, given, isFloating) });
	return { placedOf, region };
}

function regionElement({ context, page, laid, at, given, isFloating, placed }) {
	return h(
		"div",
		{
			className: `wg-tree-region ${regionClassOf(laid, at)}`,
			key: at,
			"data-region": at,
			ref: heldRegion(page, at, isFloating),
			...regionSurfaceAttrs(placed.worn),
			style: {
				...(at === laid.keep || isFloating ? { flex: "1 1 0", minWidth: 0 } : { flex: `0 0 ${given}px`, minWidth: 0 }),
				...plateVars(placed.plate),
			},
		},
		h(TreeRegion, regionPropsOf(context, page, laid, at, placed)),
	);
}

function regionClassOf(laid, at) {
	return at === laid.keep ? "is-main" : `is-${sideOf(laid.drawn, at)}`;
}

function heldRegion({ regionsRef, everyRegionRef }, at, isFloating) {
	return (node) => {
		if (node && !node.closest(".wg-drawer-over:not(.is-open)")) regionsRef.current.set(at, node);
		else regionsRef.current.delete(at);
		if (node) everyRegionRef.current.set(`${at}:${isFloating}`, node);
		else everyRegionRef.current.delete(`${at}:${isFloating}`);
	};
}

function regionPropsOf(context, page, laid, at, placed) {
	return {
		node: placed.node,
		shared: context.shared,
		editing: context.editing,
		settingsId: context.settingsId,
		settingsStandInPx: context.settingsStandInPx,
		onOpenSettings: context.onOpenSettings,
		onRemove: context.onRemove,
		onAdd: context.onAdd,
		patchTile: context.patchTile,
		commitHolds: context.commitHolds,
		insets: page.insets,
		tileOf: laid.tileOf,
		pressAt: context.pressAt,
		carry: page.carrying,
		onCarry: page.carryFrom,
		overlay: at === laid.overlayAt ? laid.unplaced : [],
	};
}
