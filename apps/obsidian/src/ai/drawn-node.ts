import type { LaidNode } from "@widgetarium/core/tree-laid.js";

export function drawnNode(node: LaidNode, depth: number): string {
	const pad = "  ".repeat(depth);
	if (node.kind === "collapsed")
		return [`${pad}collapsed into ${node.into}`, drawnNode(node.node, depth + 1)].join("\n");
	const worn = node.surface ? ` · ${node.surface}` : "";
	if (node.kind === "leaf") return `${pad}${node.id} · ${Math.round(node.width)}px wide${worn}`;
	const said = `${pad}${node.dir}${node.isStacked ? " (stacked)" : ""} · ${Math.round(node.width)}px · gaps drawn ${
		node.of
			.slice(0, -1)
			.map((child) => `${Math.round(Number(child.gapAfter))}px`)
			.join(", ") || "none"
	}${worn}`;
	return [said, ...node.of.map((child) => drawnNode(child, depth + 1))].join("\n");
}
