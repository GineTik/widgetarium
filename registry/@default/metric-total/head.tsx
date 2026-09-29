import { PeriodPicker } from "./period-picker";
import { Stroked } from "./stroked";
import type { HeadProps, Tone } from "./types";
import { ViewToggle } from "./view-toggle";

const ARROWS: Record<Tone, string> = {
	up: "M10 15.4V5.5M5.7 9.8L10 5.5l4.3 4.3",
	down: "M10 4.6v9.9M5.7 10.2L10 14.5l4.3-4.3",
	flat: "M4.6 10h10.8M10.9 5.7L15.2 10l-4.3 4.3",
};

const NOTHING_TO_COMPARE = "new";

export function Head({ title, summary, label, days, view, rows, onView, onPeriod }: HeadProps) {
	return (
		<div data-part="head" className="mt3-head">
			<div data-part="head-left" className="mt3-head-left">
				<span data-part="title" className="mt3-title">
					{title}
				</span>
				<ViewToggle view={view} onView={onView} />
			</div>
			<div data-part="head-right" className="mt3-head-right">
				<span data-part="trend" className="mt3-trend">
					<Stroked part="trend-arrow" className="mt3-trend-arrow" size={15} weight={2.1} join>
						<path d={ARROWS[summary.direction]} />
					</Stroked>
					{percentSaid(summary.percent)}
				</span>
				<PeriodPicker label={label} days={days} rows={rows} onPeriod={onPeriod} />
			</div>
		</div>
	);
}

function percentSaid(percent: number | null): string {
	if (percent === null) return NOTHING_TO_COMPARE;
	return `${Math.abs(percent).toFixed(1)}%`;
}
