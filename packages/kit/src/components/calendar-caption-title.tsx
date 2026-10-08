import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MONTH_NAMES } from "../constants/calendar";
import type { CaptionLayout } from "../constants/calendar";
import type { CalendarView } from "../hooks/use-calendar";
import { monthOptionsOf, yearOptionsOf } from "../utils/calendar-options";
import { CalendarDropdown } from "./calendar-dropdown";
import { CalendarMonthLabel } from "./calendar-month-label";

export interface CalendarCaptionTitleProps {
	readonly month: Date;
	readonly view: CalendarView;
}

interface CaptionLists {
	readonly hasMonthList: boolean;
	readonly hasYearList: boolean;
}

const LISTS_OF_LAYOUT: Readonly<Record<Exclude<CaptionLayout, "label">, CaptionLists>> = {
	dropdown: { hasMonthList: true, hasYearList: true },
	"dropdown-months": { hasMonthList: true, hasYearList: false },
	"dropdown-years": { hasMonthList: false, hasYearList: true },
};

export function CalendarCaptionTitle({ month, view }: CalendarCaptionTitleProps): ReactElement {
	if (view.captionLayout === "label") return <CalendarMonthLabel month={month} />;
	const year = month.getFullYear();
	const index = month.getMonth();
	const { hasMonthList, hasYearList } = LISTS_OF_LAYOUT[view.captionLayout];
	return (
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
	);
}
