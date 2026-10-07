import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCalendar } from "../hooks/use-calendar";
import { cn } from "../utils/cn";
import { dayKey } from "../utils/calendar";
import { CalendarMonth } from "./calendar-month";
import type { CalendarProps } from "./calendar-props";

export type {
	CalendarBaseProps,
	CalendarMultipleProps,
	CalendarPickProps,
	CalendarProps,
	CalendarRangeProps,
	CalendarSingleProps,
} from "./calendar-props";

export function Calendar(props: CalendarProps): ReactElement {
	const { view, gridRef, moveWithKeys } = useCalendar(props);
	return (
		<div
			data-slot="calendar"
			data-mode={props.mode ?? "single"}
			className={cn("wg-kit-cal", view.months.length > 1 && "is-many", props.className)}
			ref={gridRef}
			onKeyDown={moveWithKeys}
		>
			{view.months.map((month, at) => (
				<CalendarMonth
					key={dayKey(month)}
					month={month}
					view={view}
					isFirst={at === 0}
					isLast={at === view.months.length - 1}
				/>
			))}
		</div>
	);
}
