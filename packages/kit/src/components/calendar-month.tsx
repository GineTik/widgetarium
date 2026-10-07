import { createElement as h } from "react";
import type { ReactElement } from "react";
import { WEEKDAY_NAMES } from "../constants/calendar";
import type { CalendarView } from "../hooks/use-calendar";
import { dayKey, monthDays, weekdaysFrom, weeksOf } from "../utils/calendar";
import { CalendarCaption } from "./calendar-caption";
import { CalendarDay } from "./calendar-day";

export interface CalendarMonthProps {
	readonly month: Date;
	readonly view: CalendarView;
	readonly isFirst: boolean;
	readonly isLast: boolean;
}

export function CalendarMonth({ month, view, isFirst, isLast }: CalendarMonthProps): ReactElement {
	const days = monthDays({
		year: month.getFullYear(),
		month: month.getMonth(),
		weekStartsOn: view.weekStartsOn,
		fixedWeeks: view.fixedWeeks,
	});
	return (
		<div className="wg-kit-cal-view" data-slot="calendar-month">
			<CalendarCaption month={month} view={view} isFirst={isFirst} isLast={isLast} />
			<div className="wg-kit-cal-grid" role="grid">
				<div className="wg-kit-cal-row" role="row">
					{weekdaysFrom(view.weekStartsOn).map((weekday) => (
						<span key={weekday} role="columnheader" className="wg-kit-cal-weekday" aria-label={WEEKDAY_NAMES[weekday]}>
							{WEEKDAY_NAMES[weekday]?.charAt(0)}
						</span>
					))}
				</div>
				{weeksOf(days).map((week) => (
					<div key={dayKey(week[0]?.date ?? month)} className="wg-kit-cal-row" role="row">
						{week.map((day) => (
							<CalendarDay
								key={dayKey(day.date)}
								day={view.cellOf(day)}
								tabStop={view.tabStop}
								isHidden={day.outside && !view.showOutsideDays}
								onSelect={view.pick}
								renderDay={view.renderDay}
							/>
						))}
					</div>
				))}
			</div>
		</div>
	);
}
