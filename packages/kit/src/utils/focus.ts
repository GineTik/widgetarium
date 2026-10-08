import { FOCUSABLE } from "../constants/overlays";
import { isFocusable } from "./dom-nodes";

const AUTOFOCUS = "[data-wg-autofocus]";

export function isFocusVisible(element: Element): boolean {
	try {
		return element.matches(":focus-visible");
	} catch {
		return true;
	}
}

export function focusQuietly(target: Element | null | undefined): void {
	const held = target ?? null;
	if (isFocusable(held)) held.focus({ preventScroll: true });
}

export function focusInitial(panel: HTMLElement | null): void {
	if (!panel) return;
	focusQuietly(panel.querySelector(AUTOFOCUS) ?? focusablesIn(panel)[0] ?? panel);
}

export function returnFocusTo(trigger: Element | null | undefined): void {
	if (!trigger) return;
	focusQuietly(trigger.matches(FOCUSABLE) ? trigger : focusablesIn(trigger)[0]);
}

export interface KeyPress {
	readonly key: string;
	readonly shiftKey: boolean;
	preventDefault(): void;
}

export function trapTab(event: KeyPress, panel: HTMLElement): void {
	if (event.key !== "Tab") return;
	const inside = focusablesIn(panel);
	if (inside.length > 0 && !isLeavingPanel(inside, event.shiftKey)) return;
	event.preventDefault();
	focusQuietly(event.shiftKey ? inside.at(-1) : inside[0]);
}

function isLeavingPanel(inside: readonly HTMLElement[], isBackward: boolean): boolean {
	return document.activeElement === (isBackward ? inside[0] : inside.at(-1));
}

function focusablesIn(root: ParentNode): HTMLElement[] {
	return [...root.querySelectorAll(FOCUSABLE)].filter(isFocusable);
}
