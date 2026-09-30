import {
	HIDE,
	isAlwaysToggled,
	isBox,
	isFolded,
	MENU,
	openKeyOf,
	regionCollapseOf,
	SHEET,
	sideOf,
	toggleFold,
	toggleFoldAt,
} from "../tree.js";
import type { BoardNode } from "../tree-nodes.js";
import type { Toggle } from "../tree-collapse.js";
import type { PressAt } from "../drawer.js";
import type { CommitLayout } from "./board-edits.js";
import { lookOf } from "./collapsed-panel.js";
import type { LaidTree } from "./lay-tree.js";

const SHOW_NAMED = "Show {name}";
const HIDE_NAMED = "Hide {name}";
const HIDE_UNNAMED: Readonly<Record<string, string>> = {
	left: "Hide the left panel",
	right: "Hide the right panel",
	[SHEET]: "Hide the bottom panel",
	[MENU]: "Hide the menu",
};
const SHOW_UNNAMED: Readonly<Record<string, string>> = {
	left: "Show the left panel",
	right: "Show the right panel",
	[SHEET]: "Show the bottom panel",
	[MENU]: "Show the menu",
};
const ICON_OF_LOOK: Readonly<Record<string, string>> = {
	left: "panel-left",
	right: "panel-right",
	[SHEET]: "panel-bottom",
	[MENU]: "menu",
};

type PressBox = (point?: PressAt | null) => void;

export interface BoxAction {
	readonly key: string;
	readonly icon: string | undefined;
	readonly title: string | undefined;
	readonly isOn: boolean;
	readonly press: PressBox;
}

export interface BoxActionChrome extends Pick<LaidTree, "drawn" | "root" | "keep"> {
	readonly open: ReadonlySet<string>;
	readonly toggleOpen: (openKey: string, point?: PressAt | null) => void;
	readonly commitLayout: CommitLayout;
}

interface BoxActionAsk {
	readonly openKey: string;
	readonly look: string;
	readonly name: string | null | undefined;
	readonly isOn: boolean;
	readonly press: PressBox;
}

export function floatingAction(at: number, chrome: BoxActionChrome): BoxAction | null {
	const node = chrome.drawn.of[at];
	const into = regionCollapseOf(chrome.drawn, at);
	if (!node || triggerOf(node) || into === HIDE) return null;
	const openKey = openKeyOf(node, [at]);
	return boxAction({
		openKey,
		look: lookOf(into, sideOf(chrome.drawn, at)),
		name: nameOf(node),
		isOn: chrome.open.has(openKey),
		press: (point) => chrome.toggleOpen(openKey, point),
	});
}

export function dockedAction(at: number, chrome: BoxActionChrome): BoxAction | null {
	const node = chrome.drawn.of[at];
	if (!node || at === chrome.keep || !isAlwaysToggled(node) || triggerOf(node)) return null;
	return boxAction({
		openKey: openKeyOf(node, [at]),
		look: sideOf(chrome.drawn, at),
		name: nameOf(node),
		isOn: !isFolded(chrome.root, at),
		press: () => chrome.commitLayout((held) => toggleFold(held, at)),
	});
}

export function nestedAction(toggle: Toggle, chrome: BoxActionChrome): BoxAction | null {
	if (toggle.hasTrigger) return null;
	const foldAt: PressBox = () => chrome.commitLayout((held) => toggleFoldAt(held, toggle.path));
	if (toggle.kind === "box")
		return boxAction({
			openKey: toggle.openKey ?? "",
			look: toggle.side,
			name: toggle.label,
			isOn: true,
			press: foldAt,
		});
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

export function triggerPoint(openKey: string): PressAt | null {
	const tile = openKey.split("/")[0] ?? "";
	const cell = document.querySelector(`.wg-tree-cell[data-cell="${CSS.escape(tile)}"]`);
	if (!cell) return null;
	const box = cell.getBoundingClientRect();
	return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function triggerOf(node: BoardNode): string | undefined {
	return isBox(node) ? node.trigger : undefined;
}

function nameOf(node: BoardNode): string | undefined {
	return node.name ?? (isBox(node) ? node.purpose : undefined);
}

function toggleTitle(name: string | null | undefined, look: string, isOn: boolean): string | undefined {
	if (name) return (isOn ? HIDE_NAMED : SHOW_NAMED).replace("{name}", name);
	return (isOn ? HIDE_UNNAMED : SHOW_UNNAMED)[look];
}

function boxAction({ openKey, look, name, isOn, press }: BoxActionAsk): BoxAction {
	return { key: `box:${openKey}`, icon: ICON_OF_LOOK[look], title: toggleTitle(name, look, isOn), isOn, press };
}
