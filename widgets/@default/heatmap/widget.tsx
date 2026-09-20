import { createWidget, defineManifest, defineProp, pickedValue, useData } from "widgetarium";
import type { Aka, Day, Navigation, VaultRecord } from "widgetarium";
import { isoOf, leadDaysOf, readLog } from "@default/lib";
import type { LogEntry } from "@default/lib";

const ALL_DAYS = 2000;

const STYLE = `
.habit-heatmap {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	min-width: 0;
}

.hh-months {
	flex: none;
	position: relative;
	height: 1.4em;
	font-size: var(--font-ui-smaller, 12px);
	line-height: 1.4em;
	color: var(--text-faint);
}

.hh-month {
	position: absolute;
	top: 0;
	overflow: hidden;
	white-space: nowrap;
}

.hh-grid {
	flex: none;
	display: block;
	width: 100%;
	height: auto;
}

.hh-cell {
	fill: var(--wg-kit-fill-hover);
}

.hh-cell.is-done {
	fill: var(--wg-kit-accent);
	cursor: pointer;
}

.hh-cell.is-today {
	stroke: var(--text-muted);
	stroke-width: 1px;
	vector-effect: non-scaling-stroke;
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

type MonthSpan = { month: number; column: number; weeks: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK = 7;
const CELL = 10;
const GAP = 3;
const PITCH = CELL + GAP;
const SQUARE_CORNER = 2.5;

function weeksOf(year: number, isWeekStartingMonday: boolean): (string | null)[] {
	const lead = leadDaysOf(new Date(year, 0, 1).getDay(), isWeekStartingMonday);
	const days: (string | null)[] = [];
	for (let at = 0; at < lead; at += 1) days.push(null);
	for (const day = new Date(year, 0, 1); day.getFullYear() === year; day.setDate(day.getDate() + 1)) {
		days.push(isoOf(day));
	}
	while (days.length % WEEK !== 0) days.push(null);
	return days;
}

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
		else spans.push({ month, column, weeks: 1 });
	}
	return spans;
}

type DayTotal = { value: number; path: string };

function totalsByDate(log: LogEntry[]): Map<string, DayTotal> {
	const totals = new Map<string, DayTotal>();
	for (const entry of log) {
		const total = totals.get(entry.date);
		if (total) total.value += entry.value;
		else totals.set(entry.date, { value: entry.value, path: entry.path ?? "" });
	}
	return totals;
}

function gridWidthOf(days: (string | null)[]): number {
	return (days.length / WEEK) * PITCH - GAP;
}

function MonthLabels({ days }: { days: (string | null)[] }) {
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

function cellMarksOf(step: number, isToday: boolean): string {
	return ["hh-cell", step > 0 && "is-done", isToday && "is-today"].filter(Boolean).join(" ");
}

type DayCellProps = {
	iso: string;
	at: number;
	total: DayTotal | undefined;
	top: number;
	cornerRadius: number;
	isToday: boolean;
	navigator: Navigation;
};

function DayCell({ iso, at, total, top, cornerRadius, isToday, navigator }: DayCellProps) {
	const value = total?.value ?? 0;
	const step = stepOf(value, top);
	return (
		<rect
			className={cellMarksOf(step, isToday)}
			x={Math.floor(at / WEEK) * PITCH}
			y={(at % WEEK) * PITCH}
			width={CELL}
			height={CELL}
			rx={cornerRadius}
			fillOpacity={step > 0 ? 0.25 + step * 0.1875 : undefined}
			onClick={total && (() => navigator?.navigate?.(total.path))}
		>
			<title>{`${iso} — ${value || "nothing"}`}</title>
		</rect>
	);
}

type YearGridProps = {
	log: LogEntry[];
	year: number;
	cornerRadius: number;
	isMondayFirst: boolean;
	navigator: Navigation;
};

function YearGrid({ log, year, cornerRadius, isMondayFirst, navigator }: YearGridProps) {
	const totals = totalsByDate(log);
	const top = Math.max(...[...totals.values()].map((total) => total.value), 1);
	const days = weeksOf(year, isMondayFirst);
	const today = isoOf(new Date());
	return (
		<>
			<MonthLabels days={days} />
			<svg
				className="hh-grid"
				viewBox={`0 0 ${gridWidthOf(days)} ${WEEK * PITCH - GAP}`}
				role="img"
				aria-label={String(year)}
			>
				{days.map((iso, at) =>
					iso ? (
						<DayCell
							key={iso}
							{...{ iso, at, top, cornerRadius, navigator }}
							total={totals.get(iso)}
							isToday={iso === today}
						/>
					) : null,
				)}
			</svg>
		</>
	);
}

export const manifest = defineManifest({
	title: "Heatmap",
	description: "A year of squares: every day you kept a habit, in one glance.",
	keywords: [
		"heatmap",
		"habit",
		"streak",
		"year",
		"calendar",
		"grid",
		"tracker",
		"daily",
		"consistency",
		"squares",
		"github",
		"log",
	],
	role: "indicator",
	size: { collapseBelowPx: 320 },
	preview: {
		size: { w: 7, h: 3 },
		props: {
			log: {
				rows: [
					{
						path: "preview/exercise.md",
						title: "Exercise",
						props: {
							title: "Exercise",
							entries: [
								"2026-01-01",
								"2026-01-05",
								"2026-01-07",
								"2026-01-12",
								"2026-01-16",
								"2026-01-20",
								"2026-01-21",
								"2026-01-22",
								"2026-01-29",
								"2026-02-01",
								"2026-02-10",
								"2026-02-12",
								"2026-02-15",
								"2026-02-17",
								"2026-02-18",
								"2026-02-24",
								"2026-02-25",
								"2026-02-26",
								"2026-03-01",
								"2026-03-02",
								"2026-03-05",
								"2026-03-09",
								"2026-03-14",
								"2026-03-18",
								"2026-03-20",
								"2026-03-21",
								"2026-03-23",
								"2026-03-25",
								"2026-03-26",
								"2026-04-07",
								"2026-04-08",
								"2026-04-16",
								"2026-04-17",
								"2026-04-18",
								"2026-04-19",
								"2026-04-22",
								"2026-04-27",
								"2026-05-01",
								"2026-05-07",
								"2026-05-08",
								"2026-05-12",
								"2026-05-16",
								"2026-05-18",
								"2026-05-22",
								"2026-05-23",
								"2026-05-24",
								"2026-05-25",
								"2026-05-27",
								"2026-05-28",
								"2026-05-29",
								"2026-06-05",
								"2026-06-09",
								"2026-06-19",
								"2026-06-23",
								"2026-06-25",
								"2026-06-29",
								"2026-07-07",
								"2026-07-13",
								"2026-07-18",
								"2026-07-19",
								"2026-07-22",
								"2026-07-23",
								"2026-07-25",
								"2026-07-31",
								"2026-08-04",
								"2026-08-07",
								"2026-08-16",
								"2026-08-17",
								"2026-08-18",
								"2026-08-22",
								"2026-08-23",
								"2026-08-26",
							],
						},
					},
					{
						path: "preview/reading.md",
						title: "Reading",
						props: {
							title: "Reading",
							entries: [
								"2026-02-10",
								"2026-02-12",
								"2026-02-13",
								"2026-02-15",
								"2026-02-16",
								"2026-02-18",
								"2026-02-23",
								"2026-02-25",
								"2026-03-02",
								"2026-03-04",
								"2026-03-05",
								"2026-03-06",
								"2026-03-07",
								"2026-03-10",
								"2026-03-12",
								"2026-03-13",
								"2026-03-15",
								"2026-03-23",
								"2026-03-24",
								"2026-03-26",
								"2026-03-29",
								"2026-04-04",
								"2026-04-10",
								"2026-04-11",
								"2026-04-22",
								"2026-04-26",
								"2026-04-29",
								"2026-04-30",
								"2026-05-05",
								"2026-05-07",
								"2026-05-10",
								"2026-05-12",
								"2026-05-17",
								"2026-05-18",
								"2026-05-22",
								"2026-05-30",
								"2026-06-01",
								"2026-06-04",
								"2026-06-05",
								"2026-06-06",
								"2026-06-11",
								"2026-06-14",
								"2026-06-18",
								"2026-06-20",
								"2026-06-23",
								"2026-06-25",
								"2026-06-29",
								"2026-07-01",
								"2026-07-05",
								"2026-07-07",
								"2026-07-09",
								"2026-07-12",
								"2026-07-13",
								"2026-07-15",
								"2026-07-20",
								"2026-07-21",
								"2026-08-02",
								"2026-08-03",
								"2026-08-12",
								"2026-08-15",
								"2026-08-22",
							],
						},
					},
				],
			},
		},
		shot: { of: "181870122" },
	},
	props: {
		log: defineProp<DayNote[]>()({
			label: "Log",
			default: [],
			describes: {
				days: { type: "date", many: true, aka: ["entries", "dates", "log", "checkins"] },
				done: { type: "number", aka: ["kept", "value", "count", "steps", "amount", "score"] },
			},
		}),
		pick: defineProp<string>()({
			label: "Which habit",
			hint: "One habit only. Nothing picked draws all of them.",
			of: "log",
			field: "name",
		}),
		year: defineProp<number>()({
			label: "Year, or 0 for this one",
			default: 0,
		}),
		isRound: defineProp<boolean>()({
			label: "Round cells instead of square",
			design: true,
			default: false,
		}),
		isWeekStartingMonday: defineProp<boolean>()({
			label: "Weeks start on Monday",
			default: true,
		}),
	},
});

export default createWidget(
	manifest,
	({ pick, year: shownYear, isRound, isWeekStartingMonday, log: source, navigator }) => {
		const rows = useData(source.list, { limit: ALL_DAYS }).data;
		const picked = pickedValue(useData(pick.get).data);
		const asked = Number(useData(shownYear.get).data);
		const isRoundCell = Boolean(useData(isRound.get).data);
		const isMondayFirst = useData(isWeekStartingMonday.get).data !== false;

		if (rows.length === 0) {
			return (
				<div className="habit-heatmap">
					<style>{STYLE}</style>
					<p className="hh-empty">Point this widget at a folder of habit notes, or a folder of daily notes.</p>
				</div>
			);
		}

		return (
			<div className="habit-heatmap">
				<style>{STYLE}</style>
				<YearGrid
					log={readLog(rows, { pick: picked })}
					year={asked > 0 ? asked : new Date().getFullYear()}
					cornerRadius={isRoundCell ? CELL / 2 : SQUARE_CORNER}
					{...{ isMondayFirst, navigator }}
				/>
			</div>
		);
	},
);
