import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { dayKey, sameDay } from "../utils/calendar";
import type { CalendarCell } from "../utils/calendar";

export interface CalendarDayProps {
	readonly day: CalendarCell;
	readonly tabStop: Date;
	readonly isHidden?: boolean | undefined;
	readonly onSelect?: ((day: Date) => void) | undefined;
	readonly renderDay?: ((day: CalendarCell) => ReactNode) | undefined;
}

export function CalendarDay({ day, tabStop, isHidden = false, onSelect, renderDay }: CalendarDayProps): ReactElement {
	const { date } = day;
	if (isHidden) return <span role="gridcell" className="wg-kit-cal-day is-hidden" aria-hidden="true" />;
	return (
		<button
			type="button"
			data-date={dayKey(date)}
			data-day={date.toISOString()}
			data-selected={day.selected ? "" : undefined}
			data-today={day.today ? "" : undefined}
			data-outside={day.outside ? "" : undefined}
			data-disabled={day.disabled ? "" : undefined}
			data-range-start={day.rangeStart ? "true" : undefined}
			data-range-middle={day.rangeMiddle ? "true" : undefined}
			data-range-end={day.rangeEnd ? "true" : undefined}
			tabIndex={sameDay(date, tabStop) && !day.outside ? 0 : -1}
			disabled={day.disabled}
			className={cn(
				"wg-kit-cal-day",
				day.outside && "is-outside",
				day.today && "is-today",
				day.selected && !day.rangeMiddle && "is-picked",
				day.rangeMiddle && "is-between",
				day.rangeStart && !day.rangeEnd && "is-range-start",
				day.rangeEnd && !day.rangeStart && "is-range-end",
			)}
			role="gridcell"
			aria-selected={day.selected}
			onClick={() => onSelect?.(date)}
		>
			{renderDay ? renderDay(day) : String(date.getDate())}
		</button>
	);
}
