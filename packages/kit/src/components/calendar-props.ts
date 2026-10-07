import type { ReactNode } from "react";
import type { CaptionLayout, WeekDay } from "../constants/calendar";
import type { CalendarCell } from "../utils/calendar";
import type { DateRange, Matchers } from "../utils/calendar-matchers";

export interface CalendarBaseProps {
	readonly month?: Date | undefined;
	readonly defaultMonth?: Date | undefined;
	readonly onMonthChange?: ((month: Date) => void) | undefined;
	readonly startMonth?: Date | undefined;
	readonly endMonth?: Date | undefined;
	readonly numberOfMonths?: number | undefined;
	readonly captionLayout?: CaptionLayout | undefined;
	readonly disabled?: Matchers;
	readonly required?: boolean | undefined;
	readonly showOutsideDays?: boolean | undefined;
	readonly fixedWeeks?: boolean | undefined;
	readonly weekStartsOn?: WeekDay | undefined;
	readonly today?: Date | undefined;
	readonly renderDay?: ((day: CalendarCell) => ReactNode) | undefined;
	readonly className?: string | undefined;
}

export interface CalendarPickProps extends CalendarBaseProps {
	readonly mode?: undefined;
	readonly selected?: Date | null | undefined;
	readonly onSelect?: ((date: Date, triggerDate: Date) => void) | undefined;
}

export interface CalendarSingleProps extends CalendarBaseProps {
	readonly mode: "single";
	readonly selected?: Date | null | undefined;
	readonly onSelect?: ((date: Date | undefined, triggerDate: Date) => void) | undefined;
}

export interface CalendarMultipleProps extends CalendarBaseProps {
	readonly mode: "multiple";
	readonly selected?: readonly Date[] | undefined;
	readonly onSelect?: ((dates: Date[] | undefined, triggerDate: Date) => void) | undefined;
}

export interface CalendarRangeProps extends CalendarBaseProps {
	readonly mode: "range";
	readonly selected?: DateRange | undefined;
	readonly onSelect?: ((range: DateRange | undefined, triggerDate: Date) => void) | undefined;
}

export type CalendarProps = CalendarPickProps | CalendarSingleProps | CalendarMultipleProps | CalendarRangeProps;
