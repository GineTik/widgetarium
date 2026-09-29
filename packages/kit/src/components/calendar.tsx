import type { LooseProps } from "../types";
import { createElement as h, useRef } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useDayFocusByKeys } from "../hooks/use-day-focus-by-keys";
import { IconButton } from "./icon-button";
import { Icon } from "../icons/icon";
import { calendarDays, dayKey } from "../utils/calendar";
import { cn } from "../utils/cn";
import { CalendarDay } from "./calendar-day";

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

export function Calendar({
	month,
	defaultMonth,
	onMonthChange,
	selected,
	today,
	onSelect,
	renderDay,
	className: cls,
}: LooseProps) {
	const now = today ?? new Date();
	const [shown, setShown] = useControllableState({
		prop: month,
		defaultProp: defaultMonth ?? selected ?? now,
		onChange: onMonthChange,
	});
	const gridRef = useRef(null);
	const year = shown.getFullYear();
	const index = shown.getMonth();
	const inMonth = (date) => date && date.getFullYear() === year && date.getMonth() === index;
	const tabStop = inMonth(selected) ? selected : inMonth(now) ? now : new Date(year, index, 1);
	const moveWithKeys = useDayFocusByKeys({ gridRef, shown, setShown, inMonth });
	const step = (by) => setShown(new Date(year, index + by, 1));

	return (
		<div className={cn("wg-kit-cal", cls)}>
			<div className="wg-kit-cal-head">
				<IconButton size="s" label="Previous month" onClick={() => step(-1)}>
					<Icon name="fold" />
				</IconButton>
				<span className="wg-kit-cal-month">{`${MONTH_NAMES[index]} ${year}`}</span>
				<IconButton size="s" label="Next month" onClick={() => step(1)}>
					<Icon name="chevron" />
				</IconButton>
			</div>
			<div className="wg-kit-cal-grid" role="grid" ref={gridRef} onKeyDown={moveWithKeys}>
				{WEEKDAY_INITIALS.map((initial, at) => (
					<span key={at} className="wg-kit-cal-weekday">
						{initial}
					</span>
				))}
				{calendarDays(year, index, now, selected).map((day) => (
					<CalendarDay key={dayKey(day.date)} day={day} tabStop={tabStop} onSelect={onSelect} renderDay={renderDay} />
				))}
			</div>
		</div>
	);
}
