import { useLayoutEffect, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { dayKey, moveByKey } from "../utils/calendar";
import { isElement } from "../utils/dom-nodes";

export interface DayFocusAsk {
	readonly gridRef: RefObject<HTMLElement | null>;
	readonly shown: Date;
	readonly setShown: (month: Date) => void;
	readonly inMonth: (day: Date) => boolean;
}

export function useDayFocusByKeys({ gridRef, shown, setShown, inMonth }: DayFocusAsk): (event: KeyboardEvent) => void {
	const [focusWanted, setFocusWanted] = useState<Date | null>(null);

	useLayoutEffect(() => {
		if (!focusWanted) return;
		gridRef.current?.querySelector<HTMLElement>(`[data-date="${dayKey(focusWanted)}"]`)?.focus();
		setFocusWanted(null);
	}, [focusWanted, shown]);

	return (event) => {
		const next = dayMovedBy(event);
		if (!next) return;
		event.preventDefault();
		if (!inMonth(next)) setShown(new Date(next.getFullYear(), next.getMonth(), 1));
		setFocusWanted(next);
	};
}

function dayMovedBy(event: KeyboardEvent): Date | null {
	const from = isElement(event.target) ? event.target.closest<HTMLElement>("[data-date]") : null;
	return from ? moveByKey(new Date(from.dataset["day"] ?? ""), event.key) : null;
}
