import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MONTH_NAMES } from "../constants/calendar";

export interface CalendarMonthLabelProps {
	readonly month: Date;
}

export function CalendarMonthLabel({ month }: CalendarMonthLabelProps): ReactElement {
	return (
		<span
			className="wg-kit-cal-month"
			aria-live="polite"
		>{`${MONTH_NAMES[month.getMonth()] ?? ""} ${month.getFullYear()}`}</span>
	);
}
