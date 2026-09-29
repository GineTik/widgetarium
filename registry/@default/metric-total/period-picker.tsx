import { Button, Popover, PopoverItem } from "widgetarium/kit";
import { Stroked } from "./stroked";
import type { HeadProps } from "./types";

const CARET = "M6.4 8.6l3.6 3.4 3.6-3.4";

export function PeriodPicker({
	label,
	days,
	rows,
	onPeriod,
}: Omit<HeadProps, "title" | "summary" | "view" | "onView">) {
	return (
		<Popover
			className="mt3-periods"
			placement="below"
			trigger={
				<Button variant="ghost" size="s" className="mt3-period" data-part="period">
					<span className="mt3-period-long">{label}</span>
					<span className="mt3-period-short">{`${days}d`}</span>
					<Stroked part="period-caret" className="mt3-period-caret" size={16} weight={1.7} join>
						<path d={CARET} />
					</Stroked>
				</Button>
			}
		>
			{rows.map((row) => (
				<PopoverItem key={row.ref} onClick={() => onPeriod(row.ref)}>
					{row.label}
				</PopoverItem>
			))}
		</Popover>
	);
}
