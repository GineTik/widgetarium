import type { KeyboardEvent } from "react";
import { buttonClass } from "./class-names";
import { cn } from "./cn";
import type { ClassNameValue } from "./cn";
import { focusQuietly } from "./focus";
import { focusStepped } from "./focus-step";
import { ROW_STEP_OF_KEY } from "./roving";

const TOP_LEVEL =
	':scope > li > [data-slot="navigation-menu-trigger"], :scope > li > [data-slot="navigation-menu-link"]';

export function navigationMenuTriggerStyle(className?: ClassNameValue): string {
	return buttonClass({ variant: "ghost", className: cn("wg-kit-nav-trigger", className) });
}

export function moveAcrossNavigation(event: KeyboardEvent<HTMLElement>): void {
	const items = [...event.currentTarget.querySelectorAll<HTMLElement>(TOP_LEVEL)];
	focusStepped(event, items, ROW_STEP_OF_KEY.get(event.key), { focus: focusQuietly, entersFromOutside: false });
}

export function focusFirstLinkIn(panelOf: () => Element | null): void {
	requestAnimationFrame(() => requestAnimationFrame(() => focusQuietly(panelOf()?.querySelector("a, button"))));
}
