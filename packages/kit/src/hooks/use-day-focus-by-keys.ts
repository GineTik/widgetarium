import { useLayoutEffect, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { DAYS_SEARCHED_PAST_DISABLED } from "../constants/calendar";
import { dayKey, moveByKey } from "../utils/calendar";
import { isElement } from "../utils/dom-nodes";

export interface DayFocusAsk {
	readonly gridRef: RefObject<HTMLElement | null>;
	readonly shown: Date;
	readonly isInView: (day: Date) => boolean;
	readonly revealDay: (day: Date) => void;
	readonly isDisabled: (day: Date) => boolean;
}

export function useDayFocusByKeys({
	gridRef,
	shown,
	isInView,
	revealDay,
	isDisabled,
}: DayFocusAsk): (event: KeyboardEvent) => void {
	const [focusWanted, setFocusWanted] = useState<Date | null>(null);

	useLayoutEffect(() => {
		if (!focusWanted) return;
		gridRef.current?.querySelector<HTMLElement>(`[data-date="${dayKey(focusWanted)}"]:not([data-outside])`)?.focus();
		setFocusWanted(null);
	}, [focusWanted, shown]);

	return (event) => {
		const next = dayMovedBy(event, isDisabled);
		if (!next) return;
		event.preventDefault();
		if (!isInView(next)) revealDay(next);
		setFocusWanted(next);
	};
}

function dayMovedBy(event: KeyboardEvent, isDisabled: (day: Date) => boolean): Date | null {
	const from = isElement(event.target) ? event.target.closest<HTMLElement>("[data-date]") : null;
	if (!from) return null;
	let next = moveByKey(new Date(from.dataset["day"] ?? ""), event.key);
	for (let tries = 0; next && isDisabled(next) && tries < DAYS_SEARCHED_PAST_DISABLED; tries += 1)
		next = moveByKey(next, event.key);
	return next;
}
