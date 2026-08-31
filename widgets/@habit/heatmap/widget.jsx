import { createWidget, WidgetRoot } from "widgetarium";
import { isoOf, readLog, streakOf } from "@habit/lib";

const STYLE = `
.habit-heatmap {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-3, 12px);
	overflow: auto;
}

.hh-head {
	display: flex;
	align-items: baseline;
	gap: var(--size-4-2, 8px);
	flex-wrap: wrap;
}

.hh-title {
	margin: 0;
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
}

.hh-note {
	font-size: var(--font-ui-small, 14px);
	color: var(--text-muted);
}

.hh-months {
	display: grid;
	grid-auto-flow: column;
	gap: 2px;
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.hh-month {
	overflow: hidden;
	white-space: nowrap;
}

.hh-grid {
	display: grid;
	grid-template-rows: repeat(7, 1fr);
	grid-auto-flow: column;
	grid-auto-columns: 1fr;
	gap: 2px;
	min-width: 0;
}

.hh-cell {
	aspect-ratio: 1;
	min-width: 4px;
	border: 0;
	padding: 0;
	border-radius: 2px;
	background: var(--background-modifier-border);
	opacity: 0.45;
	cursor: default;
}

.hh-cell.is-round {
	border-radius: 50%;
}

.hh-cell.is-done {
	opacity: 1;
	background: var(--interactive-accent);
	cursor: pointer;
}

.hh-cell.is-outside {
	visibility: hidden;
}

.hh-cell.is-today {
	outline: 1px solid var(--text-normal);
	outline-offset: 1px;
}

.hh-foot {
	display: flex;
	gap: var(--size-4-4, 16px);
	font-size: var(--font-ui-small, 14px);
	color: var(--text-muted);
}

.hh-foot b {
	color: var(--text-normal);
}

.hh-empty {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--text-muted);
}
`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK = 7;

// CONTEXT: the grid is columns of weeks, so it must start on the weekday the year's first day fell
function weeksOf(year, startMonday) {
	const first = new Date(year, 0, 1);
	const lead = startMonday ? (first.getDay() + 6) % 7 : first.getDay();
	const days = [];
	for (let at = 0; at < lead; at += 1) days.push(null);
	for (const day = new Date(year, 0, 1); day.getFullYear() === year; day.setDate(day.getDate() + 1)) {
		days.push(isoOf(day));
	}
	while (days.length % WEEK !== 0) days.push(null);
	return days;
}

// CONTEXT: four steps is what GitHub reads as a scale — more shades stop being distinguishable
function stepOf(value, top) {
	if (value <= 0) return 0;
	return Math.min(4, Math.ceil((value / Math.max(top, 1)) * 4));
}

function monthSpans(days) {
	const spans = [];
	for (let column = 0; column * WEEK < days.length; column += 1) {
		const iso = days.slice(column * WEEK, column * WEEK + WEEK).find(Boolean);
		const month = iso ? Number(iso.slice(5, 7)) - 1 : -1;
		const last = spans[spans.length - 1];
		if (last && last.month === month) last.weeks += 1;
		else spans.push({ month, weeks: 1 });
	}
	return spans;
}

export default createWidget(function HabitHeatmap({ settings, data, navigator }) {
	const rows = data?.log?.rows ?? [];
	const log = readLog(rows, { field: settings.field, pick: settings.pick });
	const today = isoOf(new Date());
	const year = Number(settings.year) > 0 ? Number(settings.year) : new Date().getFullYear();

	const byDate = new Map();
	for (const entry of log) byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.value);
	const top = Math.max(...byDate.values(), 1);

	const days = weeksOf(year, settings.startMonday !== false);
	const months = monthSpans(days);
	const inYear = log.filter((entry) => entry.date.startsWith(String(year)));
	const streak = streakOf(inYear, { maxGap: 0, today });
	const named = settings.pick ? settings.pick : "every habit";

	if (rows.length === 0) {
		return (
			<WidgetRoot className="habit-heatmap">
				<style>{STYLE}</style>
				<div className="hh-head">
					<h3 className="hh-title">Heatmap</h3>
				</div>
				<p className="hh-empty">Point this widget at a folder of habit notes, or a folder of daily notes.</p>
			</WidgetRoot>
		);
	}

	return (
		<WidgetRoot className="habit-heatmap">
			<style>{STYLE}</style>
			<div className="hh-head">
				<h3 className="hh-title">{year}</h3>
				<span className="hh-note">{named}</span>
			</div>
			<div className="hh-months" style={{ gridTemplateColumns: months.map((span) => `${span.weeks}fr`).join(" ") }}>
				{months.map((span, at) => (
					<span className="hh-month" key={at}>
						{span.month >= 0 && span.weeks > 1 ? MONTHS[span.month] : ""}
					</span>
				))}
			</div>
			<div className="hh-grid">
				{days.map((iso, at) => {
					const value = iso ? (byDate.get(iso) ?? 0) : 0;
					const step = stepOf(value, top);
					const marks = ["hh-cell"];
					if (!iso) marks.push("is-outside");
					if (settings.round) marks.push("is-round");
					if (step > 0) marks.push("is-done");
					if (iso === today) marks.push("is-today");
					return (
						<button
							type="button"
							key={at}
							className={marks.join(" ")}
							style={step > 0 ? { opacity: 0.25 + step * 0.1875 } : undefined}
							title={iso ? `${iso} — ${value || "nothing"}` : ""}
							disabled={!iso || step === 0}
							onClick={() => navigator?.navigate?.(log.find((entry) => entry.date === iso)?.path ?? "")}
						/>
					);
				})}
			</div>
			<div className="hh-foot">
				<span>
					<b>{inYear.length}</b> days marked
				</span>
				<span>
					streak <b>{streak.current}</b>
				</span>
				<span>
					best <b>{streak.best}</b>
				</span>
			</div>
		</WidgetRoot>
	);
});
