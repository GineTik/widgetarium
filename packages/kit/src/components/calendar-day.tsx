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

type DayFlag = Exclude<keyof CalendarCell, "date">;

const MARK_OF_FLAG: readonly (readonly [attribute: string, flag: DayFlag, mark: string])[] = [
	["data-selected", "selected", ""],
	["data-today", "today", ""],
	["data-outside", "outside", ""],
	["data-disabled", "disabled", ""],
	["data-range-start", "rangeStart", "true"],
	["data-range-middle", "rangeMiddle", "true"],
	["data-range-end", "rangeEnd", "true"],
];

const CLASS_OF_DAY: readonly (readonly [className: string, isWorn: (day: CalendarCell) => boolean])[] = [
	["is-outside", (day) => day.outside],
	["is-today", (day) => day.today],
	["is-picked", (day) => day.selected && !day.rangeMiddle],
	["is-between", (day) => day.rangeMiddle],
	["is-range-start", (day) => day.rangeStart && !day.rangeEnd],
	["is-range-end", (day) => day.rangeEnd && !day.rangeStart],
];

export function CalendarDay({ day, tabStop, isHidden = false, onSelect, renderDay }: CalendarDayProps): ReactElement {
	const { date } = day;
	if (isHidden) return <span role="gridcell" className="wg-kit-cal-day is-hidden" aria-hidden="true" />;
	return (
		<button
			type="button"
			data-date={dayKey(date)}
			data-day={date.toISOString()}
			{...dayMarksOf(day)}
			tabIndex={isTabStop(day, tabStop) ? 0 : -1}
			disabled={day.disabled}
			className={dayClassOf(day)}
			role="gridcell"
			aria-selected={day.selected}
			onClick={() => onSelect?.(date)}
		>
			{renderDay ? renderDay(day) : String(date.getDate())}
		</button>
	);
}

function dayMarksOf(day: CalendarCell): Readonly<Record<string, string>> {
	return Object.fromEntries(
		MARK_OF_FLAG.filter(([, flag]) => day[flag]).map(([attribute, , mark]) => [attribute, mark]),
	);
}

function dayClassOf(day: CalendarCell): string {
	return cn("wg-kit-cal-day", ...CLASS_OF_DAY.filter(([, isWorn]) => isWorn(day)).map(([className]) => className));
}

function isTabStop(day: CalendarCell, tabStop: Date): boolean {
	return sameDay(day.date, tabStop) && !day.outside;
}
