import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import type { CalendarProps } from "../components/calendar-props";
import { MONDAY } from "../constants/calendar";
import type { CaptionLayout, WeekDay } from "../constants/calendar";
import { daysOfMonth, sameDay } from "../utils/calendar";
import type { CalendarCell, MonthDay } from "../utils/calendar";
import { isDayAllowed } from "../utils/calendar-matchers";
import { firstSelected, marksOf } from "../utils/calendar-selection";
import { useCalendarMonths } from "./use-calendar-months";
import type { CalendarMonths } from "./use-calendar-months";
import { useCalendarSelection } from "./use-calendar-selection";
import type { CalendarChoice } from "./use-calendar-selection";
import { useDayFocusByKeys } from "./use-day-focus-by-keys";

export interface CalendarView extends CalendarMonths {
	readonly captionLayout: CaptionLayout;
	readonly weekStartsOn: WeekDay;
	readonly fixedWeeks: boolean;
	readonly showOutsideDays: boolean;
	readonly tabStop: Date;
	readonly cellOf: (day: MonthDay) => CalendarCell;
	readonly pick: (day: Date) => void;
	readonly renderDay?: ((day: CalendarCell) => ReactNode) | undefined;
}

export interface CalendarState {
	readonly view: CalendarView;
	readonly gridRef: RefObject<HTMLDivElement | null>;
	readonly moveWithKeys: (event: KeyboardEvent) => void;
}

interface TabStopAsk {
	readonly months: CalendarMonths;
	readonly wanted: readonly (Date | undefined)[];
	readonly isDisabled: (day: Date) => boolean;
}

interface ViewAsk {
	readonly props: CalendarProps;
	readonly months: CalendarMonths;
	readonly choice: CalendarChoice;
	readonly now: Date;
	readonly picked: Date | undefined;
	readonly isDisabled: (day: Date) => boolean;
}

type CellAsk = Pick<ViewAsk, "choice" | "now" | "isDisabled">;

export function useCalendar(props: CalendarProps): CalendarState {
	const [todayAtMount] = useState(() => new Date());
	const now = props.today ?? todayAtMount;
	const choice = useCalendarSelection(props);
	const picked = firstSelected(choice.held);
	const months = useCalendarMonths(props, now, picked);
	const gridRef = useRef<HTMLDivElement>(null);
	const isDisabled = (day: Date): boolean => !isDayAllowed(day, { disabled: props.disabled, bounds: months.bounds });
	const moveWithKeys = useDayFocusByKeys({ gridRef, isDisabled, ...months });
	return { view: viewOf({ props, months, choice, now, picked, isDisabled }), gridRef, moveWithKeys };
}

function viewOf({ props, months, choice, now, picked, isDisabled }: ViewAsk): CalendarView {
	return {
		...months,
		captionLayout: props.captionLayout ?? "label",
		weekStartsOn: props.weekStartsOn ?? MONDAY,
		fixedWeeks: props.fixedWeeks ?? true,
		showOutsideDays: props.showOutsideDays ?? true,
		tabStop: tabStopOf({ months, wanted: [picked, now], isDisabled }),
		cellOf: (day) => cellOf(day, { choice, now, isDisabled }),
		pick: choice.pick,
		renderDay: props.renderDay,
	};
}

function cellOf({ date, outside }: MonthDay, { choice, now, isDisabled }: CellAsk): CalendarCell {
	return {
		date,
		outside,
		today: sameDay(date, now),
		disabled: isDisabled(date),
		...marksOf(date, choice.mode, choice.held),
	};
}

function tabStopOf({ months, wanted, isDisabled }: TabStopAsk): Date {
	const isReachable = (day: Date): boolean => months.isInView(day) && !isDisabled(day);
	const asked = wanted.find((day): day is Date => day !== undefined && isReachable(day));
	return asked ?? months.months.flatMap(daysOfMonth).find((day) => !isDisabled(day)) ?? months.shown;
}
