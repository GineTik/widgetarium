import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CalendarOption } from "../utils/calendar-options";
import { scrollChosenIntoView } from "../utils/scroll-chosen";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

export interface CalendarDropdownProps {
	readonly label: string;
	readonly value: number;
	readonly options: readonly CalendarOption[];
	readonly onPick: (value: number) => void;
}

export function CalendarDropdown({ label, value, options, onPick }: CalendarDropdownProps): ReactElement {
	return (
		<Select
			value={value}
			isPortaled
			onValueChange={(picked) => {
				if (typeof picked === "number") onPick(picked);
			}}
		>
			<SelectTrigger variant="ghost" size="sm" aria-label={label} className="wg-kit-cal-dropdown">
				<SelectValue />
			</SelectTrigger>
			<SelectContent className="wg-kit-cal-dropdown-list">
				<span hidden ref={scrollChosenIntoView} />
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value} disabled={option.disabled}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
