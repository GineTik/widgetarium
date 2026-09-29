import {
	HIDE,
	isAlwaysToggled,
	isFolded,
	MENU,
	openKeyOf,
	regionCollapseOf,
	SHEET,
	sideOf,
	toggleFold,
	toggleFoldAt,
} from "../tree.js";
import { lookOf } from "./collapsed-panel.js";

const SHOW_NAMED = "Show {name}";
const HIDE_NAMED = "Hide {name}";
const HIDE_UNNAMED = {
	left: "Hide the left panel",
	right: "Hide the right panel",
	[SHEET]: "Hide the bottom panel",
	[MENU]: "Hide the menu",
};
const SHOW_UNNAMED = {
	left: "Show the left panel",
	right: "Show the right panel",
	[SHEET]: "Show the bottom panel",
	[MENU]: "Show the menu",
};
const ICON_OF_LOOK = { left: "panel-left", right: "panel-right", [SHEET]: "panel-bottom", [MENU]: "menu" };

export function floatingAction(at, chrome) {
	const node = chrome.drawn.of[at];
	const into = regionCollapseOf(chrome.drawn, at);
	if (node.trigger || into === HIDE) return null;
	const openKey = openKeyOf(node, [at]);
	return boxAction({
		openKey,
		look: lookOf(into, sideOf(chrome.drawn, at)),
		name: node.name ?? node.purpose,
		isOn: chrome.open.has(openKey),
		press: (point) => chrome.toggleOpen(openKey, point),
	});
}

export function dockedAction(at, chrome) {
	const node = chrome.drawn.of[at];
	if (at === chrome.keep || !isAlwaysToggled(node) || node.trigger) return null;
	return boxAction({
		openKey: openKeyOf(node, [at]),
		look: sideOf(chrome.drawn, at),
		name: node.name ?? node.purpose,
		isOn: !isFolded(chrome.root, at),
		press: () => chrome.commitLayout((held) => toggleFold(held, at)),
	});
}

export function nestedAction(toggle, chrome) {
	if (toggle.hasTrigger) return null;
	const foldAt = () => chrome.commitLayout((held) => toggleFoldAt(held, toggle.path));
	if (toggle.kind === "box")
		return boxAction({ openKey: toggle.openKey, look: toggle.side, name: toggle.label, isOn: true, press: foldAt });
	if (toggle.isFolded)
		return boxAction({ openKey: toggle.openKey, look: toggle.side, name: toggle.name, isOn: false, press: foldAt });
	if (toggle.into === HIDE) return null;
	return boxAction({
		openKey: toggle.openKey,
		look: lookOf(toggle.into, toggle.side),
		name: toggle.name,
		isOn: chrome.open.has(toggle.openKey),
		press: (point) => chrome.toggleOpen(toggle.openKey, point),
	});
}

export function triggerPoint(openKey) {
	const tile = openKey.split("/")[0];
	const cell = document.querySelector(`.wg-tree-cell[data-cell="${CSS.escape(tile)}"]`);
	if (!cell) return null;
	const box = cell.getBoundingClientRect();
	return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function toggleTitle(name, look, isOn) {
	if (name) return (isOn ? HIDE_NAMED : SHOW_NAMED).replace("{name}", name);
	return (isOn ? HIDE_UNNAMED : SHOW_UNNAMED)[look];
}

function boxAction({ openKey, look, name, isOn, press }) {
	return { key: `box:${openKey}`, icon: ICON_OF_LOOK[look], title: toggleTitle(name, look, isOn), isOn, press };
}
