import type { KeyboardEvent } from "react";
import type { MenuState } from "../components/menu-context";
import { MENU_ITEM, TYPEAHEAD_RESET_MS } from "../constants/overlays";
import { isNode } from "./dom-nodes";
import { focusQuietly } from "./focus";
import { stepIndex } from "./roving";
import type { Step } from "./roving";

const STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowDown", 1],
	["ArrowUp", -1],
	["Home", "first"],
	["End", "last"],
]);

interface Typed {
	readonly text: string;
	readonly at: number;
}

const TYPED_IN = new WeakMap<Element, Typed>();

export function moveInMenu(event: KeyboardEvent<HTMLElement>, menu: MenuState): void {
	if (!isNode(event.target) || !event.currentTarget.contains(event.target)) return;
	const step = STEP_OF_KEY.get(event.key);
	if (step !== undefined) {
		event.preventDefault();
		focusMenuItem(event.currentTarget, step);
		return;
	}
	if (event.key === "ArrowLeft" && menu.parent) {
		event.preventDefault();
		menu.setOpen(false);
		focusQuietly(menu.triggerRef.current);
		return;
	}
	if (event.key === "Tab") {
		event.preventDefault();
		menu.closeTree();
		return;
	}
	if (isTypedLetter(event)) typeAhead(event.currentTarget, event.key);
}

export function focusMenuItem(panel: Element, step: Step): void {
	const items = menuItemsIn(panel);
	if (items.length === 0) return;
	const at = items.findIndex((item) => item === document.activeElement);
	focusQuietly(items[stepIndex(at, step, items.length)]);
}

export function menuItemsIn(panel: Element): HTMLElement[] {
	return [...panel.querySelectorAll<HTMLElement>(MENU_ITEM)];
}

function isTypedLetter(event: KeyboardEvent): boolean {
	return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

function typeAhead(panel: Element, letter: string): void {
	const now = Date.now();
	const before = TYPED_IN.get(panel);
	const text =
		before && now - before.at < TYPEAHEAD_RESET_MS ? before.text + letter.toLowerCase() : letter.toLowerCase();
	TYPED_IN.set(panel, { text, at: now });
	const items = menuItemsIn(panel);
	const at = items.findIndex((item) => item === document.activeElement);
	const ordered = [...items.slice(at + 1), ...items.slice(0, at + 1)];
	focusQuietly(ordered.find((item) => labelOf(item).startsWith(text)));
}

function labelOf(item: HTMLElement): string {
	return (item.dataset["textValue"] ?? item.textContent ?? "").trim().toLowerCase();
}
