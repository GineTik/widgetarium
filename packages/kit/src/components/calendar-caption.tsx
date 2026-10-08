import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CalendarView } from "../hooks/use-calendar";
import { CalendarCaptionTitle } from "./calendar-caption-title";
import { CalendarStepButton } from "./calendar-step-button";

export interface CalendarCaptionProps {
	readonly month: Date;
	readonly view: CalendarView;
	readonly isFirst: boolean;
	readonly isLast: boolean;
}

export function CalendarCaption({ month, view, isFirst, isLast }: CalendarCaptionProps): ReactElement {
	return (
		<div className="wg-kit-cal-head" data-slot="calendar-caption">
			<CalendarStepButton view={view} step={-1} isShown={isFirst} />
			<CalendarCaptionTitle month={month} view={view} />
			<CalendarStepButton view={view} step={1} isShown={isLast} />
		</div>
	);
}
