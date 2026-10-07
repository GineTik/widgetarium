import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MONTH_NAMES } from "../constants/calendar";
import type { CalendarView } from "../hooks/use-calendar";
import { Icon } from "../icons/icon";
import { monthsAfter } from "../utils/calendar";
import { monthOptionsOf, yearOptionsOf } from "../utils/calendar-options";
import { CalendarDropdown } from "./calendar-dropdown";
import { IconButton } from "./icon-button";

export interface CalendarCaptionProps {
	readonly month: Date;
	readonly view: CalendarView;
	readonly isFirst: boolean;
	readonly isLast: boolean;
}

export function CalendarCaption({ month, view, isFirst, isLast }: CalendarCaptionProps): ReactElement {
	const year = month.getFullYear();
	const index = month.getMonth();
	const layout = view.captionLayout;
	const hasMonthList = layout === "dropdown" || layout === "dropdown-months";
	const hasYearList = layout === "dropdown" || layout === "dropdown-years";
	return (
		<div className="wg-kit-cal-head" data-slot="calendar-caption">
			<IconButton
				size="s"
				label="Previous month"
				className={isFirst ? undefined : "is-gap"}
				disabled={!isFirst || !view.canStepBack}
				onClick={() => view.showMonth(monthsAfter(view.shown, -1))}
			>
				<Icon name="fold" />
			</IconButton>
			{layout === "label" ? (
				<span className="wg-kit-cal-month" aria-live="polite">{`${MONTH_NAMES[index] ?? ""} ${year}`}</span>
			) : (
				<span className="wg-kit-cal-caption">
					{hasMonthList ? (
						<CalendarDropdown
							label="Month"
							value={index}
							options={monthOptionsOf(year, view.bounds)}
							onPick={(picked) => view.showMonth(new Date(year, picked, 1))}
						/>
					) : (
						<span className="wg-kit-cal-month">{MONTH_NAMES[index]}</span>
					)}
					{hasYearList ? (
						<CalendarDropdown
							label="Year"
							value={year}
							options={yearOptionsOf(view.firstYear, view.lastYear)}
							onPick={(picked) => view.showMonth(new Date(picked, index, 1))}
						/>
					) : (
						<span className="wg-kit-cal-month">{String(year)}</span>
					)}
				</span>
			)}
			<IconButton
				size="s"
				label="Next month"
				className={isLast ? undefined : "is-gap"}
				disabled={!isLast || !view.canStepAhead}
				onClick={() => view.showMonth(monthsAfter(view.shown, 1))}
			>
				<Icon name="chevron" />
			</IconButton>
		</div>
	);
}
