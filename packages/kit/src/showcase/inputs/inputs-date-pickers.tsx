import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Button, Calendar, Icon, Popover, PopoverContent, PopoverTrigger } from "../../index";
import type { DateRange } from "../../index";
import { Named } from "../frame/named";
import { SHOWCASE_TODAY } from "../showcase-data";

export function InputsDatePickers(): ReactElement {
	const [date, setDate] = useState<Date | undefined>(undefined);
	const [isOpen, setOpen] = useState(false);
	const [range, setRange] = useState<DateRange | undefined>({
		from: new Date(2026, 9, 12),
		to: new Date(2026, 9, 21),
	});
	return (
		<div className="wg-showcase-stack">
			<Named name="Popover + Calendar mode=single captionLayout=dropdown">
				<Popover open={isOpen} onOpenChange={setOpen} placement="below">
					<PopoverTrigger asChild>
						<Button variant="outline">
							{date ? date.toLocaleDateString("en-GB") : "Select date"}
							<Icon name="chevron-down" size={16} />
						</Button>
					</PopoverTrigger>
					<PopoverContent>
						<Calendar
							mode="single"
							captionLayout="dropdown"
							selected={date}
							today={SHOWCASE_TODAY}
							onSelect={(picked) => {
								setDate(picked);
								setOpen(false);
							}}
						/>
					</PopoverContent>
				</Popover>
			</Named>
			<Named name="Calendar mode=range numberOfMonths=2">
				<Calendar
					mode="range"
					numberOfMonths={2}
					defaultMonth={range?.from}
					selected={range}
					onSelect={setRange}
					today={SHOWCASE_TODAY}
				/>
			</Named>
		</div>
	);
}
