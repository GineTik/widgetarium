import type { LooseProps } from "../types";
import { createElement as h, useState } from "react";
import { IconButton } from "./icon-button";
import { Icon } from "../icons/icon";
import { cx } from "../utils/cx";

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

const CALENDAR_CELLS = 42;

function startOfCalendar(year, month) {
	const first = new Date(year, month, 1);
	const lead = (first.getDay() + 6) % 7;
	return new Date(year, month, 1 - lead);
}

function sameDay(one, other) {
	if (!one || !other) return false;
	return (
		one.getFullYear() === other.getFullYear() &&
		one.getMonth() === other.getMonth() &&
		one.getDate() === other.getDate()
	);
}

export function Calendar({ month, onMonthChange, selected, today, onSelect, renderDay, className: cls }: LooseProps) {
	const [ownMonth, setOwnMonth] = useState(() => month ?? selected ?? today ?? new Date());
	const shown = month ?? ownMonth;
	const year = shown.getFullYear();
	const index = shown.getMonth();
	const now = today ?? new Date();
	const first = startOfCalendar(year, index);

	const step = (by) => {
		const next = new Date(year, index + by, 1);
		if (month === undefined) setOwnMonth(next);
		onMonthChange?.(next);
	};

	const cells = [];
	for (let offset = 0; offset < CALENDAR_CELLS; offset += 1) {
		const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
		const day = {
			date,
			outside: date.getMonth() !== index,
			today: sameDay(date, now),
			selected: sameDay(date, selected),
		};
		cells.push(
			<button
				type="button"
				key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
				className={cx(
					"wg-kit-cal-day",
					day.outside && "is-outside",
					day.today && "is-today",
					day.selected && "is-picked",
				)}
				aria-pressed={String(day.selected)}
				onClick={() => onSelect?.(date)}
			>
				{renderDay ? renderDay(day) : String(date.getDate())}
			</button>,
		);
	}

	return (
		<div className={cx("wg-kit-cal", cls)}>
			<div className="wg-kit-cal-head">
				<IconButton size="s" label="Previous month" onClick={() => step(-1)}>
					<Icon name="fold" />
				</IconButton>
				<span className="wg-kit-cal-month">{`${MONTH_NAMES[index]} ${year}`}</span>
				<IconButton size="s" label="Next month" onClick={() => step(1)}>
					<Icon name="chevron" />
				</IconButton>
			</div>
			<div className="wg-kit-cal-grid">
				{WEEKDAY_INITIALS.map((initial, at) => (
					<span key={at} className="wg-kit-cal-weekday">
						{initial}
					</span>
				))}
				{cells}
			</div>
		</div>
	);
}
