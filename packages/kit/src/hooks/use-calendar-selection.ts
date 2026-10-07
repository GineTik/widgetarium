import { useState } from "react";
import type { CalendarProps } from "../components/calendar-props";
import { dateIn, datesIn, rangeIn, selectionAfter } from "../utils/calendar-selection";
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
		const next = selectionAfter({ mode, held, day, required });
		keep(next);
		reportPick(props, next, day);
	};
	return { mode, held, pick };
}

function reportPick(props: CalendarProps, next: CalendarSelection, day: Date): void {
	if (props.mode === "multiple") props.onSelect?.(next === undefined ? undefined : [...datesIn(next)], day);
	else if (props.mode === "range") props.onSelect?.(rangeIn(next), day);
	else if (props.mode === "single") props.onSelect?.(dateIn(next), day);
	else props.onSelect?.(dateIn(next) ?? day, day);
}
