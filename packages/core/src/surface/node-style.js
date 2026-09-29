import { gapVarsOf, isPainted, NO_SURFACE } from "../tree.js";

const PLATE_EDGES_PX = "2 * var(--wg-group-pad)";

export function styleOfNode(node) {
	const along = node.basisPx
		? { flex: `0 0 ${node.basisPx}px` }
		: node.basis === "auto"
			? { flexGrow: 0, flexShrink: 0, flexBasis: "auto" }
			: { flexGrow: node.grow ?? 1, flexShrink: 1, flexBasis: 0 };
	return {
		...along,
		minWidth: 0,
		...preferredSizeStyle(node),
		...(node.measure ? { maxInlineSize: `${node.measure}px`, marginInline: "auto", inlineSize: "100%" } : {}),
		...(node.kind === "box" ? { "--wg-tree-gap": `${node.gap}px` } : {}),
		...(node.kind === "leaf" ? gapVarsOf(node.level) : {}),
		...dividerReach(node),
		...plateVars(node),
	};
}

export function plateVars(plate) {
	if (!plate?.corner) return {};
	return {
		"--wg-plate-corner": `${plate.corner}px`,
		"--wg-kit-plate": `${plate.kitPlate}px`,
		"--wg-kit-item": `${plate.kitItem}px`,
	};
}

export function surfaceAttrs(node) {
	if (!node.surface || node.surface === NO_SURFACE) return {};
	const across = node.dividerAxis ? { "data-across": node.dividerAxis, "data-side": node.side } : {};
	return { "data-surface": node.surface, ...across };
}

export function regionSurfaceAttrs(worn) {
	return worn.surface === NO_SURFACE ? {} : { "data-surface": worn.surface, "data-side": worn.side };
}

function preferredSizeStyle(node) {
	const width = typeof node.preferredWidth === "number" ? node.preferredWidth : null;
	const height = typeof node.preferredHeight === "number" ? node.preferredHeight : null;
	const across = width ? { maxInlineSize: withPlateEdges(node, width), inlineSize: "100%" } : {};
	if (node.keepsRatio && width && height) return { ...across, aspectRatio: `${width} / ${height}` };
	return { ...across, ...(height ? { minHeight: withPlateEdges(node, height) } : {}) };
}

function withPlateEdges(node, px) {
	return isPainted(node) ? `calc(${px}px + ${PLATE_EDGES_PX})` : `${px}px`;
}

function dividerReach(node) {
	if (!node.dividerAxis) return {};
	return {
		"--wg-divider-before": `${node.dividerBefore ?? 0}px`,
		"--wg-divider-after": `${node.dividerAfter ?? 0}px`,
		"--wg-divider-half": `${node.dividerHalf}px`,
	};
}
