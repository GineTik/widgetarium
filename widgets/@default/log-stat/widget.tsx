import { createWidget, pickedValue, useData } from "widgetarium";
import type {
	Aka,
	CollectionGateway,
	Color,
	Day,
	GetAction,
	ListAction,
	Text,
	UpdateAction,
	ValueGateway,
	VaultRecord,
} from "widgetarium";
import { FLAME, isoOf, readLog, streakOf } from "@default/lib";
import type { LogEntry } from "@default/lib";

const STYLE = `
.habit-stat {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 2px;
	overflow: hidden;
}

.hs-cap {
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hs-value {
	display: flex;
	align-items: baseline;
	gap: 6px;
	font-size: calc(var(--font-ui-medium, 15px) * 1.7);
	font-weight: var(--font-bold, 700);
	color: var(--text-normal);
	line-height: 1.1;
}

.hs-unit {
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-normal, 400);
	color: var(--text-muted);
}

.hs-bar {
	margin-top: 6px;
	height: 4px;
	border-radius: 2px;
	background: var(--background-modifier-border);
	overflow: hidden;
}

.hs-fill {
	display: block;
	height: 100%;
	border-radius: 2px;
	background: var(--habit-ink, var(--interactive-accent));
}

.hs-head {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.is-stat1 {
	gap: 6px;
}

.hs-icon {
	display: none;
}

.is-stat1 .hs-icon {
	display: block;
	flex: none;
	width: 22px;
	height: 22px;
	fill: var(--hs-tone);
}

.is-stat1 .hs-cap {
	font-size: var(--font-ui-medium, 15px);
	color: var(--text-normal);
}

.is-stat1 .hs-value {
	gap: 6px;
	font-size: calc(var(--font-ui-medium, 15px) * 2);
	font-weight: var(--font-semibold, 600);
	font-variant-numeric: tabular-nums;
	line-height: 1;
}

.is-stat1 .hs-unit {
	font-size: var(--font-ui-medium, 15px);
}

.is-stat1 .hs-bar {
	margin-top: 2px;
	background: color-mix(in srgb, var(--hs-tone) 18%, transparent);
}

.is-stat1 .hs-fill {
	background: var(--hs-tone);
}
`;

type Habit = VaultRecord & {
	days?: (Day[] & Aka<"entries" | "dates" | "log" | "checkins">) | null;
	done?: (number & Aka<"kept" | "value" | "count" | "steps" | "amount" | "score">) | null;
	title?: (Text & Aka<"name">) | null;
	color?: (Color & Aka<"colour">) | null;
	goal?: (number & Aka<"target">) | null;
	maxGap?: (number & Aka<"max gap" | "grace">) | null;
};

type Reading = { value: number; unit: string; part?: number | undefined };

type StatProps = {
	habits: CollectionGateway<Habit, { list: ListAction }>;
	pick: ValueGateway<unknown, { get: GetAction; update?: UpdateAction }>;
	metric: ValueGateway<string>;
	period: ValueGateway<number>;
	look: ValueGateway<string>;
};

type Metric = { caption: string; glyph: string; tone: string };

export default createWidget(
	function HabitStat({ pick, metric: asked, period: lookback, habits, look }: StatProps) {
		const picked = pickedValue(useData(pick.get).data);
		const habit = habitPicked(useData(habits.list).data, picked);
		const metricKey = metricKeyOf(useData(asked.get).data);
		const metric = METRICS[metricKey];
		const isStat1 = useData(look.get).data === "stat1";
		const reading = readingOf(metricKey, habit, useData(lookback.get).data);

		return (
			<div className={isStat1 ? "habit-stat is-stat1" : "habit-stat"} style={toneVarsOf(metric, habit)}>
				<style>{STYLE}</style>
				<span className="hs-head">
					<svg className="hs-icon" viewBox="0 0 24 24" aria-hidden="true">
						<path fillRule="evenodd" clipRule="evenodd" d={metric.glyph} />
					</svg>
					<span className="hs-cap">{captionOf(metric, habit, isStat1)}</span>
				</span>
				{reading ? (
					<span className="hs-value">
						{reading.value}
						<span className="hs-unit">{reading.unit}</span>
					</span>
				) : (
					<span className="habit-sub">nothing named {picked || "anything"}</span>
				)}
				{reading?.part === undefined ? null : (
					<span className="hs-bar">
						<i className="hs-fill" style={{ width: `${Math.round(reading.part * 100)}%` }} />
					</span>
				)}
			</div>
		);
	},
	{
		props: {
			habits: {
				label: "Logs",
				default: { path: "Habits" },
			},
			pick: {
				label: "Which log",
				hint: "The log this number is about.",
				of: "habits",
				field: "name",
				fallback: "first",
			},
			metric: {
				kind: "value",
				wasSetting: true,
				type: "line",
				label: "streak · best · total · rate · goal",
				default: { value: "streak" },
			},
			period: {
				kind: "value",
				wasSetting: true,
				type: "number",
				label: "Days the rate looks back over",
				default: { value: 30 },
			},
			look: {
				kind: "value",
				type: "line",
				label: "Look: default · stat1",
				design: true,
				default: { value: "default" },
			},
		},
	},
);

const TROPHY =
	"M6 2.5h12v2h3.25c.41 0 .75.34.75.75V8a5.25 5.25 0 0 1-4.9 5.24A6.5 6.5 0 0 1 13 16.42V19h3.25c.41 0 .75.34.75.75V22H7v-2.25c0-.41.34-.75.75-.75H11v-2.58a6.5 6.5 0 0 1-4.1-3.18A5.25 5.25 0 0 1 2 8V5.25c0-.41.34-.75.75-.75H6v-2Zm12 4v4.52A3.25 3.25 0 0 0 20 8V6.5h-2ZM4 6.5V8a3.25 3.25 0 0 0 2 3.02V6.5H4Z";

const BOLT =
	"M14.2 1.2c.5-.6 1.4-.1 1.25.66L14.1 9.5h5.4c.66 0 1 .78.56 1.27L9.8 22.8c-.5.6-1.4.1-1.25-.66L9.9 14.5H4.5c-.66 0-1-.78-.56-1.27L14.2 1.2Z";

const PERCENT =
	"M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21ZM8.6 6.6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6.8 6.8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm.35-6.2a.9.9 0 0 1 1.27 1.27L8.3 17.2a.9.9 0 0 1-1.27-1.27l8.72-8.73Z";

const TARGET =
	"M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm0 2.7a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 0 1 0-15.6Zm0 2.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Z";

const METRICS = {
	streak: { caption: "Streak", glyph: FLAME, tone: "var(--wg-kit-error)" },
	best: { caption: "Best streak", glyph: TROPHY, tone: "var(--color-yellow, var(--wg-kit-warning))" },
	total: { caption: "Total check-ins", glyph: BOLT, tone: "var(--wg-kit-info)" },
	rate: { caption: "Check-in rate", glyph: PERCENT, tone: "var(--wg-kit-warning)" },
	goal: { caption: "Goal", glyph: TARGET, tone: "var(--wg-kit-success)" },
} satisfies Record<string, Metric>;

type MetricKey = keyof typeof METRICS;

function metricKeyOf(named: unknown): MetricKey {
	return typeof named === "string" && Object.hasOwn(METRICS, named) ? (named as MetricKey) : "streak";
}

function dayWord(count: number) {
	return count === 1 ? "day" : "days";
}

function habitPicked(rows: Habit[], picked: string) {
	return rows.find((row) => row.name === picked) ?? rows[0];
}

function captionOf(metric: Metric, habit: Habit | undefined, isStat1: boolean) {
	const named = habit?.title ?? habit?.name;
	if (isStat1 || !named) return metric.caption;
	return `${metric.caption} · ${named}`;
}

function toneVarsOf(metric: Metric, habit: Habit | undefined) {
	const ink = typeof habit?.color === "string" ? { "--habit-ink": habit.color } : {};
	return { "--hs-tone": metric.tone, ...ink } as Record<string, string>;
}

type Facts = { streak: ReturnType<typeof streakOf>; log: LogEntry[]; habit: Habit; period: number };

const READINGS: Record<MetricKey, (facts: Facts) => Reading> = {
	streak: ({ streak }) => ({ value: streak.current, unit: dayWord(streak.current) }),
	best: ({ streak }) => ({ value: streak.best, unit: dayWord(streak.best) }),
	total: ({ log }) => ({ value: log.length, unit: dayWord(log.length) }),
	rate: ({ log, period }) => ({ value: Math.round((log.length / period) * 100), unit: "%" }),
	goal: goalReading,
};

function goalReading({ streak, habit }: Facts): Reading {
	const goal = Number(habit.goal ?? 0);
	if (goal <= 0) return { value: streak.current, unit: dayWord(streak.current), part: 0 };
	return { value: streak.current, unit: `of ${goal} days`, part: Math.min(1, streak.current / goal) };
}

function readingOf(metric: MetricKey, habit: Habit | undefined, lookback: unknown): Reading | null {
	if (!habit) return null;
	const log = readLog([habit], { pick: habit.name });
	const streak = streakOf(log, { maxGap: Number(habit.maxGap ?? 0), today: isoOf(new Date()) });
	return READINGS[metric]({ streak, log, habit, period: Math.max(1, Number(lookback) || 30) });
}
