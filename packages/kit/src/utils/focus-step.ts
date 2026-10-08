import type { KeyboardEvent } from "react";
import { stepIndex } from "./roving";
import type { Step } from "./roving";

export interface StepRule {
	readonly focus?: ((item: HTMLElement) => void) | undefined;
	readonly entersFromOutside?: boolean | undefined;
	readonly from?: Element | null | undefined;
}

export function focusStepped(
	event: KeyboardEvent | null,
	items: readonly HTMLElement[],
	step: Step | undefined,
	rule: StepRule = {},
): void {
	if (step === undefined || items.length === 0) return;
	const current = rule.from ?? document.activeElement;
	const at = items.findIndex((item) => item === current);
	if (at === -1 && rule.entersFromOutside === false) return;
	const next = items[stepIndex(at, step, items.length)];
	if (!next) return;
	event?.preventDefault();
	(rule.focus ?? focusItem)(next);
}

export function focusAndClick(item: HTMLElement): void {
	item.focus();
	item.click();
}

export function ownedBy(root: Element, selector: string, owner: string): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(selector)].filter((item) => item.closest(owner) === root);
}

function focusItem(item: HTMLElement): void {
	item.focus();
}
