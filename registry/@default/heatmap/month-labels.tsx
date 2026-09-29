import { PITCH, WEEK, gridWidthOf } from "./grid-geometry";

type MonthSpan = { month: number; column: number; weeks: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthLabels({ days }: { days: (string | null)[] }) {
	const shareOf = (pitches: number) => `${((pitches * PITCH) / gridWidthOf(days)) * 100}%`;
	return (
		<div className="hh-months">
			{monthSpans(days)
				.filter((span) => span.month >= 0 && span.weeks > 1)
				.map((span) => (
					<span
						className="hh-month"
						key={span.month}
						style={{ left: shareOf(span.column), maxWidth: shareOf(span.weeks) }}
					>
						{MONTHS[span.month]}
					</span>
				))}
		</div>
	);
}

function monthSpans(days: (string | null)[]): MonthSpan[] {
	const spans: MonthSpan[] = [];
	for (let column = 0; column * WEEK < days.length; column += 1) {
		const iso = days.slice(column * WEEK, column * WEEK + WEEK).find(Boolean);
		const month = iso ? Number(iso.slice(5, 7)) - 1 : -1;
		const last = spans[spans.length - 1];
		if (last && last.month === month) last.weeks += 1;
		else spans.push({ month, column, weeks: 1 });
	}
	return spans;
}
