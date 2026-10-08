import type { KeyboardEvent, RefObject } from "react";
import { DAYS_SEARCHED_PAST_DISABLED } from "../constants/calendar";
import { moveByKey } from "../utils/calendar";
import { isElement } from "../utils/dom-nodes";
import { useFocusesWantedDay } from "./use-focuses-wanted-day";

export interface DayFocusAsk {
	readonly gridRef: RefObject<HTMLElement | null>;
	readonly shown: Date;
	readonly isInView: (day: Date) => boolean;
	readonly revealDay: (day: Date) => void;
	readonly isDisabled: (day: Date) => boolean;
}

export function useDayFocusByKeys(ask: DayFocusAsk): (event: KeyboardEvent) => void {
	const wantFocus = useFocusesWantedDay(ask.gridRef, ask.shown);
	return (event) => {
		const next = dayMovedBy(event, ask.isDisabled);
		if (!next) return;
		event.preventDefault();
		if (!ask.isInView(next)) ask.revealDay(next);
		wantFocus(next);
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
