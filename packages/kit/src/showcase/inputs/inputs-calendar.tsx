import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Calendar } from "../../index";
import { SHOWCASE_TODAY } from "../showcase-data";

export function InputsCalendar(): ReactElement {
	const [day, setDay] = useState<Date | undefined>(new Date(2026, 9, 14));
	return (
		<Calendar
			mode="single"
			captionLayout="dropdown"
			selected={day}
			onSelect={setDay}
			today={SHOWCASE_TODAY}
			startMonth={new Date(2000, 0, 1)}
			endMonth={new Date(2035, 11, 1)}
			disabled={{ dayOfWeek: [0] }}
		/>
	);
}
