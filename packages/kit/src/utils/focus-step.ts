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
	const next = nextItemOf(items, step, rule);
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

function nextItemOf(items: readonly HTMLElement[], step: Step | undefined, rule: StepRule): HTMLElement | undefined {
	if (step === undefined || items.length === 0) return undefined;
	const current = rule.from ?? document.activeElement;
	const at = items.findIndex((item) => item === current);
	if (at === -1 && rule.entersFromOutside === false) return undefined;
	return items[stepIndex(at, step, items.length)];
}

function focusItem(item: HTMLElement): void {
	item.focus();
}
