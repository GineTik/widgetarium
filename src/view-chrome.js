import { setIcon } from "obsidian";
import { foldLabel } from "./fold-copy.js";

const SIDEBAR_ICON = { left: "sidebar-left", right: "sidebar-right" };

// TRADE-OFF: a raw child of an unofficial container; addAction is the only official door and it opens on the right alone.
function placeLeft(view, onPress) {
	const nav = view.containerEl.querySelector(".view-header-nav-buttons");
	if (!nav) return null;
	const button = nav.ownerDocument.createElement("button");
	button.className = "clickable-icon view-action";
	setIcon(button, SIDEBAR_ICON.left);
	button.addEventListener("click", onPress);
	nav.appendChild(button);
	return button;
}

function raise(view, name, onPress) {
	const button = name === "left" ? placeLeft(view, onPress) : view.addAction(SIDEBAR_ICON.right, foldLabel(name, false), onPress);
	button?.classList.add("wg-view-action");
	return button;
}

function shed(buttons, regions) {
	for (const name of Object.keys(buttons)) {
		if (regions.some((one) => one.name === name)) continue;
		buttons[name].remove();
		delete buttons[name];
	}
}

function wear(buttons, view, region, onToggle) {
	const button = (buttons[region.name] ??= raise(view, region.name, () => onToggle(view.file?.path, region.name)));
	if (!button) {
		delete buttons[region.name];
		return;
	}
	button.setAttribute("aria-label", foldLabel(region.name, region.folded));
	button.classList.toggle("is-active", !region.folded);
}

function dress(held, view, regions, onToggle) {
	const buttons = held.get(view) ?? {};
	shed(buttons, regions);
	for (const region of regions) wear(buttons, view, region, onToggle);
	if (Object.keys(buttons).length === 0) return held.delete(view);
	return held.set(view, buttons);
}

function strip(held, view) {
	for (const button of Object.values(held.get(view) ?? {})) button.remove();
	held.delete(view);
}

function syncViews(held, workspace, regionsFor, onToggle) {
	const live = new Set();
	for (const leaf of workspace.getLeavesOfType("markdown")) {
		live.add(leaf.view);
		dress(held, leaf.view, regionsFor(leaf.view.file?.path), onToggle);
	}
	for (const view of [...held.keys()]) if (!live.has(view)) strip(held, view);
}

function stripAll(held) {
	for (const view of [...held.keys()]) strip(held, view);
}

export function createViewChrome({ workspace, regionsFor, onToggle }) {
	const held = new Map();

	return {
		sync: () => syncViews(held, workspace, regionsFor, onToggle),
		stop: () => stripAll(held),
	};
}
