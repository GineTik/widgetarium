import { MONTH_NAMES, SHORT_MONTH_LETTERS } from "../constants/calendar";
import { isMonthAllowed } from "./calendar";
import type { MonthBounds } from "./calendar";

export interface CalendarOption {
	readonly value: number;
	readonly label: string;
	readonly disabled: boolean;
}

export function monthOptionsOf(year: number, bounds: MonthBounds): CalendarOption[] {
	return MONTH_NAMES.map((name, month) => ({
		value: month,
		label: name.slice(0, SHORT_MONTH_LETTERS),
		disabled: !isMonthAllowed(new Date(year, month, 1), bounds),
	}));
}

export function yearOptionsOf(firstYear: number, lastYear: number): CalendarOption[] {
	const count = Math.max(0, lastYear - firstYear + 1);
	return Array.from({ length: count }, (_, at) => ({
		value: firstYear + at,
		label: String(firstYear + at),
		disabled: false,
	}));
}
