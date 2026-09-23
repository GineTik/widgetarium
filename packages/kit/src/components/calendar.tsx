import type { LooseProps } from "../types";
import { createElement as h, useLayoutEffect, useRef, useState } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { IconButton } from "./button";
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

const DAYS_OF_KEY = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const MONTHS_OF_KEY = { PageUp: -1, PageDown: 1 };

const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function movedByKey(date, key) {
	if (key in DAYS_OF_KEY) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + DAYS_OF_KEY[key]);
	if (key in MONTHS_OF_KEY) return new Date(date.getFullYear(), date.getMonth() + MONTHS_OF_KEY[key], date.getDate());
	return null;
}

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
	const [focusWanted, setFocusWanted] = useState(null);
	const gridRef = useRef(null);
	const year = shown.getFullYear();
	const index = shown.getMonth();
	const first = startOfCalendar(year, index);
	const inMonth = (date) => date && date.getFullYear() === year && date.getMonth() === index;
	const tabStop = inMonth(selected) ? selected : inMonth(now) ? now : new Date(year, index, 1);

	useLayoutEffect(() => {
		if (!focusWanted) return;
		gridRef.current?.querySelector(`[data-date="${dayKey(focusWanted)}"]`)?.focus();
		setFocusWanted(null);
	}, [focusWanted, shown]);

	const step = (by) => setShown(new Date(year, index + by, 1));

	const moveWithKeys = (event) => {
		const from = event.target.closest?.("[data-date]");
		const next = from ? movedByKey(new Date(from.dataset.day), event.key) : null;
		if (!next) return;
		event.preventDefault();
		if (!inMonth(next)) setShown(new Date(next.getFullYear(), next.getMonth(), 1));
		setFocusWanted(next);
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
				key={dayKey(date)}
				data-date={dayKey(date)}
				data-day={date.toISOString()}
				data-selected={day.selected ? "" : undefined}
				data-today={day.today ? "" : undefined}
				data-outside={day.outside ? "" : undefined}
				tabIndex={sameDay(date, tabStop) ? 0 : -1}
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
			<div className="wg-kit-cal-grid" role="grid" ref={gridRef} onKeyDown={moveWithKeys}>
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
