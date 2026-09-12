import { flatRows, createWidget, pickedValue, useData, WidgetRoot } from "widgetarium";
import type { Aka, CollectionGateway, Day, GetAction, ListAction, Navigation, UpdateAction, ValueGateway, VaultRecord } from "widgetarium";
import { isoOf, readLog, streakOf } from "@habit/lib";
import type { LogEntry } from "@habit/lib";

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

type DayNote = VaultRecord & {
	days?: (Day[] & Aka<"entries" | "dates" | "log" | "checkins">) | null;
	done?: (number & Aka<"kept" | "value" | "count" | "steps" | "amount" | "score">) | null;
};

type MonthSpan = { month: number; weeks: number };

type HeatmapProps = {
	log: CollectionGateway<DayNote, { list: ListAction }>;
	pick: ValueGateway<unknown, { get: GetAction; update?: UpdateAction }>;
	year: ValueGateway<number>;
	isRound: ValueGateway<boolean>;
	isWeekStartingMonday: ValueGateway<boolean>;
	navigator: Navigation;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK = 7;

// CONTEXT: the grid is columns of weeks, so it must start on the weekday the year's first day fell
function weeksOf(year: number, isWeekStartingMonday: boolean): (string | null)[] {
	const first = new Date(year, 0, 1);
	const lead = isWeekStartingMonday ? (first.getDay() + 6) % 7 : first.getDay();
	const days: (string | null)[] = [];
	for (let at = 0; at < lead; at += 1) days.push(null);
	for (const day = new Date(year, 0, 1); day.getFullYear() === year; day.setDate(day.getDate() + 1)) {
		days.push(isoOf(day));
	}
	while (days.length % WEEK !== 0) days.push(null);
	return days;
}

// CONTEXT: four steps is what GitHub reads as a scale — more shades stop being distinguishable
function stepOf(value: number, top: number): number {
	if (value <= 0) return 0;
	return Math.min(4, Math.ceil((value / Math.max(top, 1)) * 4));
}

function monthSpans(days: (string | null)[]): MonthSpan[] {
	const spans: MonthSpan[] = [];
	for (let column = 0; column * WEEK < days.length; column += 1) {
		const iso = days.slice(column * WEEK, column * WEEK + WEEK).find(Boolean);
		const month = iso ? Number(iso.slice(5, 7)) - 1 : -1;
		const last = spans[spans.length - 1];
		if (last && last.month === month) last.weeks += 1;
		else spans.push({ month, weeks: 1 });
	}
	return spans;
}

export default createWidget(function HabitHeatmap({ pick, year: shownYear, isRound, isWeekStartingMonday, log: source, navigator }: HeatmapProps) {
	const listedRows = useData(source.list);
	const rows = flatRows(listedRows.rows);
	const picked = pickedValue(useData(pick.get).data);
	const log: LogEntry[] = readLog(rows, { pick: picked });
	const today = isoOf(new Date());
	const asked = Number(useData(shownYear.get).data);
	const year = asked > 0 ? asked : new Date().getFullYear();
	const isRoundCell = Boolean(useData(isRound.get).data);

	const byDate = new Map();
	for (const entry of log) byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.value);
	const top = Math.max(...byDate.values(), 1);

	const days = weeksOf(year, useData(isWeekStartingMonday.get).data !== false);
	const months = monthSpans(days);
	const inYear = log.filter((entry) => entry.date.startsWith(String(year)));
	const streak = streakOf(inYear, { maxGap: 0, today });
	const named = picked || "every habit";

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
					if (isRoundCell) marks.push("is-round");
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
}, {
	props: {
		log: {
			label: "Log",
			default: { path: "Habits" },
		},
		pick: {
			label: "Which habit",
			hint: "One habit only. Nothing picked draws all of them.",
			of: "log",
			field: "name",
		},
		year: {
			wasSetting: true,
			type: "number",
			label: "Year, or 0 for this one",
			default: { value: 0 },
		},
		isRound: {
			wasSetting: true,
			type: "boolean",
			label: "Round cells instead of square",
			design: true,
			default: { value: false },
		},
		isWeekStartingMonday: {
			wasSetting: true,
			type: "boolean",
			label: "Weeks start on Monday",
			default: { value: true },
		},
	},
});
