import { isBox } from "@widgetarium/core/tree.js";

export function drawnNode(node, depth) {
	const pad = "  ".repeat(depth);
	const worn = node.surface ? ` \u00b7 ${node.surface}` : "";
	if (!isBox(node)) {
		const tall = node.height ? ` ${node.height}px tall` : "";
		return `${pad}${node.id}${tall} \u00b7 ${Math.round(node.width)}px wide${worn}`;
	}
	const said = `${pad}${node.dir}${node.isStacked ? " (stacked)" : ""} \u00b7 ${Math.round(node.width)}px \u00b7 gaps drawn ${
		node.of
			.slice(0, -1)
			.map((child) => `${Math.round(child.gapAfter)}px`)
			.join(", ") || "none"
	}${worn}`;
	return [said, ...node.of.map((child) => drawnNode(child, depth + 1))].join("\n");
}
