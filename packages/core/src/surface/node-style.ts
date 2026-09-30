import type { CSSProperties } from "react";
import { gapVarsOf, isPainted, NO_SURFACE } from "../tree.js";
import type { LaidChild, LaidLeaf } from "../tree-laid.js";
import type { Axis, SurfaceWord } from "../tree-nodes.js";
import type { Plate } from "../tree-spacing.js";
import type { RegionSurface } from "../tree-collapse.js";

const PLATE_EDGES_PX = "2 * var(--wg-group-pad)";

export type NodeStyle = CSSProperties & Readonly<Record<`--${string}`, string>>;

interface SurfaceAttrs {
	readonly "data-surface"?: SurfaceWord;
	readonly "data-across"?: Axis;
	readonly "data-side"?: string | null | undefined;
}

export interface WornSurface {
	readonly surface?: SurfaceWord | undefined;
	readonly dividerAxis?: Axis | undefined;
	readonly side?: string | undefined;
}

export function styleOfNode(node: LaidChild): NodeStyle {
	return {
		...alongOf(node),
		minWidth: 0,
		...(node.kind === "leaf" ? preferredSizeStyle(node) : {}),
		...measureOf(node),
		...(node.kind === "box" ? { "--wg-tree-gap": `${node.gap}px` } : {}),
		...(node.kind === "leaf" ? gapVarsOf(node.level) : {}),
		...dividerReach(node),
		...(node.kind === "collapsed" ? {} : plateVars(node)),
	};
}

export function plateVars(plate: Partial<Plate> | null | undefined): NodeStyle {
	if (!plate?.corner) return {};
	return {
		"--wg-plate-corner": `${plate.corner}px`,
		"--wg-kit-plate": `${plate.kitPlate}px`,
		"--wg-kit-item": `${plate.kitItem}px`,
	};
}

export function surfaceAttrs(node: WornSurface): SurfaceAttrs {
	if (!node.surface || node.surface === NO_SURFACE) return {};
	const across = node.dividerAxis ? { "data-across": node.dividerAxis, "data-side": node.side } : {};
	return { "data-surface": node.surface, ...across };
}

export function regionSurfaceAttrs(worn: RegionSurface): SurfaceAttrs {
	return worn.surface === NO_SURFACE ? {} : { "data-surface": worn.surface, "data-side": worn.side };
}

function alongOf(node: LaidChild): CSSProperties {
	if (node.basisPx) return { flex: `0 0 ${node.basisPx}px` };
	if (node.basis === "auto") return { flexGrow: 0, flexShrink: 0, flexBasis: "auto" };
	return { flexGrow: node.grow ?? 1, flexShrink: 1, flexBasis: 0 };
}

function measureOf(node: LaidChild): CSSProperties {
	if (node.kind !== "box" || !node.measure) return {};
	return { maxInlineSize: `${node.measure}px`, marginInline: "auto", inlineSize: "100%" };
}

function preferredSizeStyle(node: LaidLeaf): CSSProperties {
	const width = typeof node.preferredWidth === "number" ? node.preferredWidth : null;
	const height = typeof node.preferredHeight === "number" ? node.preferredHeight : null;
	const across = width ? { maxInlineSize: withPlateEdges(node, width), inlineSize: "100%" } : {};
	if (node.keepsRatio && width && height) return { ...across, aspectRatio: `${width} / ${height}` };
	return { ...across, ...(height ? { minHeight: withPlateEdges(node, height) } : {}) };
}

function withPlateEdges(node: LaidLeaf, px: number): string {
	return isPainted(node) ? `calc(${px}px + ${PLATE_EDGES_PX})` : `${px}px`;
}

function dividerReach(node: LaidChild): NodeStyle {
	if (!node.dividerAxis) return {};
	return {
		"--wg-divider-before": `${node.dividerBefore ?? 0}px`,
		"--wg-divider-after": `${node.dividerAfter ?? 0}px`,
		"--wg-divider-half": `${node.dividerHalf}px`,
	};
}
