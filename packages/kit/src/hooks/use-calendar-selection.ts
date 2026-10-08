import { useState } from "react";
import type { CalendarProps } from "../components/calendar-props";
import { datesIn, firstSelected, rangeIn, withDayPicked } from "../utils/calendar-selection";
import type { CalendarMode, CalendarSelection } from "../utils/calendar-selection";

export interface CalendarChoice {
	readonly mode: CalendarMode;
	readonly held: CalendarSelection;
	readonly pick: (day: Date) => void;
}

export function useCalendarSelection(props: CalendarProps): CalendarChoice {
	const mode = props.mode ?? "single";
	const [kept, keep] = useState<CalendarSelection>(props.selected ?? undefined);
	const held = props.selected === null ? undefined : (props.selected ?? kept);
	const required = props.mode === undefined || Boolean(props.required);
	const pick = (day: Date): void => {
		const next = withDayPicked({ mode, held, day, required });
		keep(next);
		notifyPick(props, next, day);
	};
	return { mode, held, pick };
}

function notifyPick(props: CalendarProps, next: CalendarSelection, day: Date): void {
	switch (props.mode) {
		case "multiple":
			return props.onSelect?.(next === undefined ? undefined : [...datesIn(next)], day);
		case "range":
			return props.onSelect?.(rangeIn(next), day);
		case "single":
			return props.onSelect?.(firstSelected(next), day);
		case undefined:
			return props.onSelect?.(firstSelected(next) ?? day, day);
	}
}
