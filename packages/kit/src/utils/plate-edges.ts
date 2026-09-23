const NEVER_CONTENT = new Set(["STYLE", "SCRIPT", "TEMPLATE"]);

const DRAWN_WITHOUT_TEXT = "svg, img, canvas, video, input, button, textarea, select";

function holdsNothing(node) {
	if (NEVER_CONTENT.has(node.tagName)) return true;
	return node.textContent.trim() === "" && !node.matches(DRAWN_WITHOUT_TEXT) && !node.querySelector(DRAWN_WITHOUT_TEXT);
}

function standsAtEdge(node, plate, toward) {
	for (let at = node; at && at !== plate; at = at.parentElement) {
		for (let beside = at[toward]; beside; beside = beside[toward]) if (!holdsNothing(beside)) return false;
	}
	return true;
}

export function plateEdgesTakenBy(node) {
	const plate = node.parentElement?.closest('[data-surface="group"]');
	if (!plate) return null;
	const edges = ["inline"];
	if (standsAtEdge(node, plate, "previousElementSibling")) edges.push("top");
	if (standsAtEdge(node, plate, "nextElementSibling")) edges.push("bottom");
	return { plate, edges: edges.join(" ") };
}
