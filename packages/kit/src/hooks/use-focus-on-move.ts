import { useLayoutEffect, useRef } from "react";
import { firstAnswerControlOf } from "../utils/questionnaire";

export type FocusMode = "item" | "answer";

export function useFocusOnMove(
	active: string | undefined,
	elementOf: (name: string) => Element | null,
): (mode: FocusMode) => void {
	const pending = useRef<FocusMode | null>(null);
	useLayoutEffect(() => {
		const mode = pending.current;
		pending.current = null;
		const element = active === undefined ? null : elementOf(active);
		if (mode && element) focusIn(element, mode);
	}, [active]);
	return (mode) => {
		pending.current = mode;
	};
}

export function focusIn(element: Element, mode: FocusMode): void {
	const target = mode === "answer" ? (firstAnswerControlOf(element) ?? element) : element;
	if (target instanceof HTMLElement) target.focus();
}
