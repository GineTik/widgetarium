import type { KeyboardEvent } from "react";
import type { MenuState } from "../components/menu-context";
import { MENU_ITEM, TYPEAHEAD_RESET_MS } from "../constants/overlays";
import { isNode } from "./dom-nodes";
import { focusQuietly } from "./focus";
import { focusStepped } from "./focus-step";
import { COLUMN_STEP_OF_KEY } from "./roving";
import type { Step } from "./roving";

interface Typed {
	readonly text: string;
	readonly at: number;
}

const TYPED_IN = new WeakMap<Element, Typed>();

export function moveInMenu(event: KeyboardEvent<HTMLElement>, menu: MenuState): void {
	if (!isNode(event.target) || !event.currentTarget.contains(event.target)) return;
	if (isTypedLetter(event)) {
		typeAhead(event.currentTarget, event.key);
		return;
	}
	const answer = menuKeyAnswer(event, menu);
	if (!answer) return;
	event.preventDefault();
	answer();
}

export function focusMenuItem(panel: Element, step: Step): void {
	focusStepped(null, menuItemsIn(panel), step, { focus: focusQuietly });
}

function menuKeyAnswer(event: KeyboardEvent<HTMLElement>, menu: MenuState): (() => void) | null {
	const panel = event.currentTarget;
	const step = COLUMN_STEP_OF_KEY.get(event.key);
	if (step !== undefined) return () => focusMenuItem(panel, step);
	if (event.key === "ArrowLeft" && menu.parent) return () => closeSubMenu(menu);
	if (event.key === "Tab") return menu.closeTree;
	return null;
}

function closeSubMenu(menu: MenuState): void {
	menu.setOpen(false);
	focusQuietly(menu.triggerRef.current);
}

function menuItemsIn(panel: Element): HTMLElement[] {
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
