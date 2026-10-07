import { FOCUSABLE } from "../constants/overlays";
import { isFocusable, isNode } from "./dom-nodes";

const AUTOFOCUS = "[data-wg-autofocus]";

export function isFocusVisible(element: Element): boolean {
	try {
		return element.matches(":focus-visible");
	} catch {
		return true;
	}
}

export function focusablesIn(root: ParentNode): HTMLElement[] {
	return [...root.querySelectorAll(FOCUSABLE)].filter(isFocusable);
}

export function focusQuietly(target: Element | null | undefined): void {
	const held = target ?? null;
	if (isFocusable(held)) held.focus({ preventScroll: true });
}

export function focusInitial(panel: HTMLElement | null): void {
	if (!panel) return;
	focusQuietly(panel.querySelector(AUTOFOCUS) ?? focusablesIn(panel)[0] ?? panel);
}

export interface KeyPress {
	readonly key: string;
	readonly shiftKey: boolean;
	preventDefault(): void;
}

export function trapTabInside(event: KeyPress & { readonly target: EventTarget }, panel: HTMLElement | null): void {
	if (!panel || !isNode(event.target) || !panel.contains(event.target)) return;
	trapTab(event, panel);
}

function trapTab(event: KeyPress, panel: HTMLElement): void {
	if (event.key !== "Tab") return;
	const inside = focusablesIn(panel);
	const first = inside[0];
	const last = inside.at(-1);
	if (!first || !last) {
		event.preventDefault();
		return;
	}
	const leavesAtEnd = !event.shiftKey && document.activeElement === last;
	const leavesAtStart = event.shiftKey && document.activeElement === first;
	if (!leavesAtEnd && !leavesAtStart) return;
	event.preventDefault();
	focusQuietly(leavesAtEnd ? first : last);
}
