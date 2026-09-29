import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { dayKey, sameDay } from "../utils/calendar";

export function CalendarDay({ day, tabStop, onSelect, renderDay }: LooseProps) {
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
			aria-pressed={String(day.selected)}
			onClick={() => onSelect?.(date)}
		>
			{renderDay ? renderDay(day) : String(date.getDate())}
		</button>
	);
}
