import { createElement as h } from "react";
import type { ReactElement } from "react";
import { layRegion, sideOf } from "../tree.js";
import type { LaidRegion } from "../tree-laid.js";
import { plateVars, regionSurfaceAttrs } from "./node-style.js";
import type { NodeStyle } from "./node-style.js";
import type { LaidTree } from "./lay-tree.js";
import type { DrawRegion } from "./region-chrome.js";
import type { TreeBoardProps } from "./tree-board.js";
import type { TreeDraw } from "./tree-nodes.js";
import { TreeRegion } from "./tree-region.js";
import type { TreeRegionProps } from "./tree-region.js";
import type { TreePage } from "./use-tree-page.js";

export type PlacedOf = (at: number, given: number, isFloating: boolean) => LaidRegion;

type RegionContext = TreeBoardProps & Pick<TreeDraw, "pressAt">;

interface TreeRegions {
	readonly placedOf: PlacedOf;
	readonly region: DrawRegion;
}

interface RegionAt {
	readonly context: RegionContext;
	readonly page: TreePage;
	readonly laid: LaidTree;
	readonly at: number;
	readonly given: number;
	readonly isFloating: boolean;
	readonly placed: LaidRegion;
}

export function regionsOf(context: RegionContext, page: TreePage, laid: LaidTree): TreeRegions {
	const laidCache = new Map<string, LaidRegion>();
	const placedOf: PlacedOf = (at, given, isFloating) => {
		const key = `${at}:${given}:${isFloating}`;
		const cached = laidCache.get(key);
		if (cached) return cached;
		const placed = layRegion(laid.drawn, at, given, { ask: laid.ask, isFloating, viewportPx: window.innerWidth });
		laidCache.set(key, placed);
		return placed;
	};
	const region: DrawRegion = (at, given, isFloating = false) =>
		regionElement({ context, page, laid, at, given, isFloating, placed: placedOf(at, given, isFloating) });
	return { placedOf, region };
}

function regionElement({ context, page, laid, at, given, isFloating, placed }: RegionAt): ReactElement {
	const style: NodeStyle = {
		...(at === laid.keep || isFloating ? { flex: "1 1 0", minWidth: 0 } : { flex: `0 0 ${given}px`, minWidth: 0 }),
		...plateVars(placed.plate),
	};
	return h(
		"div",
		{
			className: `wg-tree-region ${regionClassOf(laid, at)}`,
			key: at,
			"data-region": at,
			ref: holdRegion(page, at, isFloating),
			...regionSurfaceAttrs(placed.worn),
			style,
		},
		h(TreeRegion, regionPropsOf(context, page, laid, at, placed)),
	);
}

function regionClassOf(laid: LaidTree, at: number): string {
	return at === laid.keep ? "is-main" : `is-${sideOf(laid.drawn, at)}`;
}

function holdRegion(
	{ regionsRef, everyRegionRef }: Pick<TreePage, "regionsRef" | "everyRegionRef">,
	at: number,
	isFloating: boolean,
): (node: HTMLDivElement | null) => void {
	return (node) => {
		if (node && !node.closest(".wg-drawer-over:not(.is-open)")) regionsRef.current.set(at, node);
		else regionsRef.current.delete(at);
		if (node) everyRegionRef.current.set(`${at}:${isFloating}`, node);
		else everyRegionRef.current.delete(`${at}:${isFloating}`);
	};
}

function regionPropsOf(
	context: RegionContext,
	page: TreePage,
	laid: LaidTree,
	at: number,
	placed: LaidRegion,
): TreeRegionProps {
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
