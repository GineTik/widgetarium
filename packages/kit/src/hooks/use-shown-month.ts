import type { CalendarBaseProps } from "../components/calendar-props";
import { startOfMonth } from "../utils/calendar";
import { useControllableState } from "./use-controllable-state";

export function useShownMonth(props: CalendarBaseProps, fallback: Date): [Date, (month: Date) => void] {
	return useControllableState({
		prop: props.month ? startOfMonth(props.month) : undefined,
		defaultProp: startOfMonth(props.defaultMonth ?? fallback),
		onChange: props.onMonthChange,
	});
}
