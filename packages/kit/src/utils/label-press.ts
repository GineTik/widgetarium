import type { MouseEvent } from "react";

const FIELD = "[data-slot='field']";

const CONTROL = "button[role='checkbox'], button[role='switch'], button[role='radio'], input, textarea, select";

const TYPED_INTO = "textarea, select, input:not([type='checkbox'], [type='radio'], [type='button'], [type='submit'])";

export function pressFieldControl(event: MouseEvent<HTMLElement>): void {
	const label = event.currentTarget;
	if (event.defaultPrevented || !(label instanceof HTMLLabelElement) || label.control) return;
	const control = onlyControlOf(label);
	if (!control) return;
	if (control.matches(TYPED_INTO)) return control.focus();
	control.click();
	control.focus({ preventScroll: true });
}

function onlyControlOf(label: HTMLLabelElement): HTMLElement | null {
	const controls = [...(label.closest(FIELD)?.querySelectorAll<HTMLElement>(CONTROL) ?? [])];
	return controls.length === 1 && !label.contains(controls[0] ?? null) ? (controls[0] ?? null) : null;
}
