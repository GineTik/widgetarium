import type { KeyboardEvent } from "react";
import { stepIndex } from "./roving";
import type { Step } from "./roving";

export function focusStepped(
	event: KeyboardEvent,
	items: readonly HTMLElement[],
	keys: ReadonlyMap<string, Step>,
): void {
	const step = keys.get(event.key);
	if (step === undefined) return;
	const at = items.findIndex((item) => item === document.activeElement);
	if (at === -1) return;
	const next = items[stepIndex(at, step, items.length)];
	if (!next) return;
	event.preventDefault();
	next.focus();
}

export function ownedBy(root: Element, selector: string, owner: string): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(selector)].filter((item) => item.closest(owner) === root);
}
