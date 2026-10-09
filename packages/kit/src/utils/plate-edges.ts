export const ROWS_TAKE_THE_PLATE_EDGE = "data-rows-flush";

export const ROWS_SHARE_THE_PLATE = "data-shares-plate";

const EVERY_EDGE = "inline top bottom";

export interface PlateEdges {
	readonly plate: Element;
	readonly edges: string;
}

type Toward = "previousElementSibling" | "nextElementSibling";

const NEVER_CONTENT = new Set(["STYLE", "SCRIPT", "TEMPLATE"]);

const DRAWN_WITHOUT_TEXT = "svg, img, canvas, video, input, button, textarea, select";

export function plateUnder(node: Element): Element | null {
	return node.parentElement?.closest('[data-surface="group"]') ?? null;
}

export function plateEdgesTakenBy(node: Element): PlateEdges | null {
	const plate = plateUnder(node);
	if (!plate || !standsAlone(node, plate)) return null;
	return { plate, edges: EVERY_EDGE };
}

export function holdsNothing(node: Element): boolean {
	if (NEVER_CONTENT.has(node.tagName)) return true;
	return (
		(node.textContent ?? "").trim() === "" &&
		!node.matches(DRAWN_WITHOUT_TEXT) &&
		!node.querySelector(DRAWN_WITHOUT_TEXT)
	);
}

function standsAlone(node: Element, plate: Element): boolean {
	return standsAtEdge(node, plate, "previousElementSibling") && standsAtEdge(node, plate, "nextElementSibling");
}

function standsAtEdge(node: Element, plate: Element, toward: Toward): boolean {
	for (let at: Element | null = node; at && at !== plate; at = at.parentElement) {
		for (let beside = at[toward]; beside; beside = beside[toward]) if (!holdsNothing(beside)) return false;
	}
	return true;
}
