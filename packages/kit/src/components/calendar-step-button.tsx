import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CalendarView } from "../hooks/use-calendar";
import { Icon } from "../icons/icon";
import { monthsAfter } from "../utils/calendar";
import { IconButton } from "./icon-button";

export interface CalendarStepButtonProps {
	readonly view: CalendarView;
	readonly step: -1 | 1;
	readonly isShown: boolean;
}

interface StepLook {
	readonly label: string;
	readonly icon: string;
	readonly canStep: (view: CalendarView) => boolean;
}

const BACK: StepLook = { label: "Previous month", icon: "fold", canStep: (view) => view.canStepBack };

const AHEAD: StepLook = { label: "Next month", icon: "chevron", canStep: (view) => view.canStepAhead };

export function CalendarStepButton({ view, step, isShown }: CalendarStepButtonProps): ReactElement {
	const look = step < 0 ? BACK : AHEAD;
	return (
		<IconButton
			size="s"
			label={look.label}
			className={isShown ? undefined : "is-gap"}
			disabled={!isShown || !look.canStep(view)}
			onClick={() => view.showMonth(monthsAfter(view.shown, step))}
		>
			<Icon name={look.icon} />
		</IconButton>
	);
}
