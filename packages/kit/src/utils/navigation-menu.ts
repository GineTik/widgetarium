import type { KeyboardEvent } from "react";
import { cn } from "./cn";
import type { ClassNameValue } from "./cn";
import { focusQuietly } from "./focus";
import { ACROSS_STEP_OF_KEY, stepIndex } from "./roving";

const TOP_LEVEL =
	':scope > li > [data-slot="navigation-menu-trigger"], :scope > li > [data-slot="navigation-menu-link"]';

const ACROSS_KEYS: ReadonlySet<string> = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

export function navigationMenuTriggerStyle(className?: ClassNameValue): string {
	return cn("wg-kit-nav-trigger", className);
}

export function moveAcrossNavigation(event: KeyboardEvent<HTMLElement>): void {
	const step = ACROSS_STEP_OF_KEY.get(event.key);
	if (step === undefined || !ACROSS_KEYS.has(event.key)) return;
	const items = [...event.currentTarget.querySelectorAll<HTMLElement>(TOP_LEVEL)];
	const at = items.findIndex((item) => item === document.activeElement);
	if (at === -1) return;
	event.preventDefault();
	focusQuietly(items[stepIndex(at, step, items.length)]);
}

export function focusFirstLinkIn(panelOf: () => Element | null): void {
	requestAnimationFrame(() => requestAnimationFrame(() => focusQuietly(panelOf()?.querySelector("a, button"))));
}
