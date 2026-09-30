import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { dayKey, sameDay } from "../utils/calendar";
import type { CalendarCell } from "../utils/calendar";

export interface CalendarDayProps {
	readonly day: CalendarCell;
	readonly tabStop: Date;
	readonly onSelect?: ((day: Date) => void) | undefined;
	readonly renderDay?: ((day: CalendarCell) => ReactNode) | undefined;
}

export function CalendarDay({ day, tabStop, onSelect, renderDay }: CalendarDayProps): ReactElement {
	const { date } = day;
	return (
		<button
			type="button"
			data-date={dayKey(date)}
			data-day={date.toISOString()}
			data-selected={day.selected ? "" : undefined}
			data-today={day.today ? "" : undefined}
			data-outside={day.outside ? "" : undefined}
			tabIndex={sameDay(date, tabStop) ? 0 : -1}
			className={cn(
				"wg-kit-cal-day",
				day.outside && "is-outside",
				day.today && "is-today",
				day.selected && "is-picked",
			)}
			aria-pressed={day.selected}
			onClick={() => onSelect?.(date)}
		>
			{renderDay ? renderDay(day) : String(date.getDate())}
		</button>
	);
}
