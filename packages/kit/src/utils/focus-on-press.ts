import type { MouseEvent } from "react";
import { isElement, isFocusable } from "./dom-nodes";

export function focusControlOnPress(event: MouseEvent<HTMLElement>, root: Element | null, selector: string): void {
	if (isElement(event.target) && event.target.closest("button")) return;
	const control = root?.querySelector(selector) ?? null;
	if (isFocusable(control)) control.focus();
}
