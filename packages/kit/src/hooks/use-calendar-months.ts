import type { CalendarBaseProps } from "../components/calendar-props";
import { YEARS_AFTER_TODAY, YEARS_BEFORE_TODAY } from "../constants/calendar";
import { monthIndex, monthsAfter, startOfMonth } from "../utils/calendar";
import type { MonthBounds } from "../utils/calendar";
import { useControllableState } from "./use-controllable-state";

export interface CalendarMonths {
	readonly shown: Date;
	readonly months: readonly Date[];
	readonly canStepBack: boolean;
	readonly canStepAhead: boolean;
	readonly firstYear: number;
	readonly lastYear: number;
	readonly bounds: MonthBounds;
	readonly showMonth: (month: Date) => void;
	readonly revealDay: (day: Date) => void;
	readonly isInView: (day: Date) => boolean;
}

export function useCalendarMonths(props: CalendarBaseProps, now: Date, picked: Date | undefined): CalendarMonths {
	const count = Math.max(1, Math.floor(props.numberOfMonths ?? 1));
	const bounds = { start: props.startMonth, end: props.endMonth };
	const [shown, setShown] = useControllableState({
		prop: props.month ? startOfMonth(props.month) : undefined,
		defaultProp: startOfMonth(props.defaultMonth ?? picked ?? now),
		onChange: props.onMonthChange,
	});
	const first = monthIndex(shown);
	const last = first + count - 1;
	const showMonth = (month: Date): void => setShown(clampMonth(startOfMonth(month), bounds, count));
	return {
		shown,
		months: Array.from({ length: count }, (_, at) => monthsAfter(shown, at)),
		canStepBack: !bounds.start || first > monthIndex(bounds.start),
		canStepAhead: !bounds.end || last < monthIndex(bounds.end),
		firstYear: (bounds.start ?? yearsFrom(now, -YEARS_BEFORE_TODAY)).getFullYear(),
		lastYear: (bounds.end ?? yearsFrom(now, YEARS_AFTER_TODAY)).getFullYear(),
		bounds,
		showMonth,
		revealDay: (day) => showMonth(monthIndex(day) < first ? day : monthsAfter(startOfMonth(day), 1 - count)),
		isInView: (day) => monthIndex(day) >= first && monthIndex(day) <= last,
	};
}

function clampMonth(month: Date, bounds: MonthBounds, count: number): Date {
	if (bounds.start && monthIndex(month) < monthIndex(bounds.start)) return startOfMonth(bounds.start);
	if (bounds.end && monthIndex(month) + count - 1 > monthIndex(bounds.end))
		return monthsAfter(startOfMonth(bounds.end), 1 - count);
	return month;
}

function yearsFrom(date: Date, years: number): Date {
	return new Date(date.getFullYear() + years, 0, 1);
}
