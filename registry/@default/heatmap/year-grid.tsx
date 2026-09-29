import type { Navigation } from "widgetarium";
import { isoOf, leadDaysOf, type LogEntry } from "@default/lib";
import { DayCell } from "./day-cell";
import { GAP, PITCH, WEEK, gridWidthOf } from "./grid-geometry";
import { MonthLabels } from "./month-labels";
import type { DayTotal } from "./types";

type YearGridProps = {
	log: LogEntry[];
	year: number;
	cornerRadius: number;
	isMondayFirst: boolean;
	navigator: Navigation;
};

export function YearGrid({ log, year, cornerRadius, isMondayFirst, navigator }: YearGridProps) {
	const totals = totalsByDate(log);
	const top = Math.max(...[...totals.values()].map((total) => total.value), 1);
	const days = weeksOf(year, isMondayFirst);
	const today = isoOf(new Date());
	return (
		<>
			<MonthLabels days={days} />
			<svg
				className="hh-grid"
				viewBox={`0 0 ${gridWidthOf(days)} ${WEEK * PITCH - GAP}`}
				role="img"
				aria-label={String(year)}
			>
				{days.map((iso, at) =>
					iso ? (
						<DayCell
							key={iso}
							{...{ iso, at, top, cornerRadius, navigator }}
							total={totals.get(iso)}
							isToday={iso === today}
						/>
					) : null,
				)}
			</svg>
		</>
	);
}

function weeksOf(year: number, isWeekStartingMonday: boolean): (string | null)[] {
	const lead = leadDaysOf(new Date(year, 0, 1).getDay(), isWeekStartingMonday);
	const days: (string | null)[] = [];
	for (let at = 0; at < lead; at += 1) days.push(null);
	for (const day = new Date(year, 0, 1); day.getFullYear() === year; day.setDate(day.getDate() + 1)) {
		days.push(isoOf(day));
	}
	while (days.length % WEEK !== 0) days.push(null);
	return days;
}

function totalsByDate(log: LogEntry[]): Map<string, DayTotal> {
	const totals = new Map<string, DayTotal>();
	for (const entry of log) {
		const total = totals.get(entry.date);
		if (total) total.value += entry.value;
		else totals.set(entry.date, { value: entry.value, path: entry.path ?? "" });
	}
	return totals;
}
