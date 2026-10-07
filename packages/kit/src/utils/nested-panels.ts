import { isElement } from "./dom-nodes";

export const NESTED_PANEL_PARENT = "data-wg-popover-parent";

const NESTED_PANEL = `[${NESTED_PANEL_PARENT}]`;

export function isInNestedPanel(target: EventTarget | null, ownId: string): boolean {
	let panel = isElement(target) ? target.closest(NESTED_PANEL) : null;
	while (panel) {
		const parentId = panel.getAttribute(NESTED_PANEL_PARENT);
		if (parentId === ownId) return true;
		panel = parentId ? (document.getElementById(parentId)?.closest(NESTED_PANEL) ?? null) : null;
	}
	return false;
}

export function hasOpenNestedPanel(ownId: string): boolean {
	return [...document.querySelectorAll(NESTED_PANEL)].some(
		(panel) => panel.getAttribute(NESTED_PANEL_PARENT) === ownId && panel.getAttribute("data-state") === "open",
	);
}
