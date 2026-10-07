import { useRef } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import type { CalendarProps } from "../components/calendar-props";
import { MONDAY } from "../constants/calendar";
import type { CaptionLayout, WeekDay } from "../constants/calendar";
import { sameDay } from "../utils/calendar";
import type { CalendarCell, MonthDay } from "../utils/calendar";
import { matchesDay } from "../utils/calendar-matchers";
import { firstSelected, marksOf } from "../utils/calendar-selection";
import { useCalendarMonths } from "./use-calendar-months";
import type { CalendarMonths } from "./use-calendar-months";
import { useCalendarSelection } from "./use-calendar-selection";
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

export function useCalendar(props: CalendarProps): CalendarState {
	const now = props.today ?? new Date();
	const choice = useCalendarSelection(props);
	const picked = firstSelected(choice.held);
	const months = useCalendarMonths(props, now, picked);
	const gridRef = useRef<HTMLDivElement>(null);
	const isDisabled = (day: Date): boolean => matchesDay(day, props.disabled);
	const moveWithKeys = useDayFocusByKeys({ gridRef, isDisabled, ...months });
	const view: CalendarView = {
		...months,
		captionLayout: props.captionLayout ?? "label",
		weekStartsOn: props.weekStartsOn ?? MONDAY,
		fixedWeeks: props.fixedWeeks ?? true,
		showOutsideDays: props.showOutsideDays ?? true,
		tabStop: tabStopOf(months, [picked, now]),
		cellOf: ({ date, outside }) => ({
			date,
			outside,
			today: sameDay(date, now),
			disabled: isDisabled(date),
			...marksOf(date, choice.mode, choice.held),
		}),
		pick: choice.pick,
		renderDay: props.renderDay,
	};
	return { view, gridRef, moveWithKeys };
}

function tabStopOf(months: CalendarMonths, wanted: readonly (Date | undefined)[]): Date {
	return wanted.find((day): day is Date => day !== undefined && months.isInView(day)) ?? months.shown;
}
