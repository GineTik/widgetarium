import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "@widgetarium/kit";
import { COLUMN, HIDE, overlayWidthOf, pathKey, ROW, SWAP } from "../tree.js";
import type { NodePath } from "../tree.js";
import type { LaidBox, LaidChild, LaidCollapsed, LaidLeaf, Placement } from "../tree-laid.js";
import type { Tile } from "../model.js";
import type { BoardEdits, PatchTile } from "./board-edits.js";
import type { Carry } from "./carry.js";
import { Cell } from "./cell.js";
import { CollapsedPanel, lookOf } from "./collapsed-panel.js";
import type { PressAtKey } from "./collapsed-panel.js";
import { styleOfNode, surfaceAttrs } from "./node-style.js";
import { SwapBox } from "./swap-box.js";
import type { SettingsSession } from "./use-settings-session.js";
import type { SurfaceShared } from "./use-surface-shared.js";

export interface TreeDraw {
	readonly shared: SurfaceShared;
	readonly editing: boolean;
	readonly settingsId: string | null;
	readonly settingsStandInPx: number;
	readonly onOpenSettings: SettingsSession["open"];
	readonly onRemove: (id: string) => void;
	readonly onAdd: (path: NodePath) => void;
	readonly patchTile: PatchTile;
	readonly commitHolds: BoardEdits["commitHolds"];
	readonly tileOf: (id: string) => Tile | undefined;
	readonly pressAt: PressAtKey;
	readonly carry: Carry | null;
}

type Laid<Node> = Node & Placement;

export function nodeElement(node: LaidChild, draw: TreeDraw): ReactNode {
	if (node.kind === "collapsed") return collapsedElement(node, draw);
	if (node.kind === "leaf") return cellElement(node, draw);
	if (node.dir === SWAP) return h(SwapBox, { key: pathKey(node.path), swap: node, draw });
	return node.dir === COLUMN ? columnElement(node, draw) : rowElement(node, draw);
}

function collapsedElement(node: Laid<LaidCollapsed>, draw: TreeDraw): ReactElement {
	const key = `collapsed-${pathKey(node.path)}`;
	const body = h("div", { className: "wg-collapsed-body" }, nodeElement(node.node, draw));
	if (node.into === HIDE) return h("div", { className: "wg-tree-fold", key, "aria-hidden": "true" }, body);
	const look = lookOf(node.into, node.side);
	const width = overlayWidthOf(node.into, window.innerWidth);
	return h(
		CollapsedPanel,
		{ key, openKey: node.openKey, look, width, shared: draw.shared, pressAt: draw.pressAt },
		body,
	);
}

function cellElement(leaf: Laid<LaidLeaf>, draw: TreeDraw): ReactElement | null {
	const tile = draw.tileOf(leaf.id);
	if (!tile) return null;
	return h(Cell, {
		key: leaf.id,
		cell: leaf,
		tile,
		definition: draw.shared.registry.get(tile.widget),
		shared: draw.shared,
		patchTile: draw.patchTile,
		standInPx: draw.carry?.id === leaf.id ? draw.carry.height : 0,
		editing: draw.editing,
		settingsStandInPx: draw.settingsId === leaf.id ? Math.max(draw.settingsStandInPx, 1) : 0,
		onOpenSettings: draw.onOpenSettings,
		onRemove: draw.onRemove,
	});
}

function rowElement(row: Laid<LaidBox>, draw: TreeDraw): ReactElement {
	const key = pathKey(row.path);
	return h(
		"div",
		{ className: "wg-tree-row", key, "data-path": key, "data-dir": ROW, style: styleOfNode(row), ...surfaceAttrs(row) },
		row.of.flatMap((child, at) => [
			at > 0 && !row.hasCollapsed
				? h("div", { key: `gap-${pathKey(child.path)}`, style: { flex: `0 0 ${row.of[at - 1]?.gapAfter}px` } })
				: null,
			nodeElement(child, draw),
		]),
	);
}

function columnElement(column: Laid<LaidBox>, draw: TreeDraw): ReactElement {
	const key = pathKey(column.path);
	const isEmpty = column.of.length === 0;
	const attrs = { className: "wg-tree", key, "data-path": key, "data-dir": COLUMN, style: styleOfNode(column) };
	return h("div", { ...attrs, ...surfaceAttrs(column) }, [
		...column.of.map((child) =>
			child.kind === "collapsed" ? collapsedElement(child, draw) : bandElement(child, draw),
		),
		draw.editing || isEmpty ? addZone(column, draw) : null,
	]);
}

function bandElement(child: LaidChild, draw: TreeDraw): ReactElement {
	return h("div", { className: "wg-tree-band", key: pathKey(child.path) }, [
		nodeElement(child, draw),
		alongElement(child),
	]);
}

function alongElement(child: LaidChild): ReactElement {
	return h("div", { key: "along", style: { height: `${child.gapAfter}px` } });
}

function addZone(column: Laid<LaidBox>, draw: TreeDraw): ReactElement {
	const isOnly = column.of.length === 0;
	return h(
		"button",
		{
			className: `wg-tree-add${isOnly ? " is-only" : ""}${draw.editing ? "" : " is-quiet"}`,
			key: "add",
			type: "button",
			style: isOnly ? undefined : { marginTop: `${column.gap}px` },
			onClick: () => draw.onAdd(column.path),
		},
		[h(Icon, { key: "plus", name: "plus", size: 20 }), h("span", { key: "label" }, "Add a widget")],
	);
}
