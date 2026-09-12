import { flatRows, createWidget, pickedValue, useData, WidgetRoot } from "widgetarium";
import type { Aka, CollectionGateway, Color, Day, GetAction, ListAction, Text, UpdateAction, ValueGateway, VaultRecord } from "widgetarium";
import { isoOf, readLog, streakOf } from "@habit/lib";
import type { LogEntry } from "@habit/lib";

const STYLE = `
.habit-stat {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 2px;
	padding: var(--size-4-3, 12px) var(--size-4-4, 16px);
	overflow: hidden;
}

.hs-cap {
	font-size: var(--font-ui-smaller, 12px);
	text-transform: uppercase;
	letter-spacing: 0.04em;
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
`;

type Habit = VaultRecord & {
	days?: (Day[] & Aka<"entries" | "dates" | "log" | "checkins">) | null;
	done?: (number & Aka<"kept" | "value" | "count" | "steps" | "amount" | "score">) | null;
	title?: (Text & Aka<"name">) | null;
	color?: (Color & Aka<"colour">) | null;
	goal?: (number & Aka<"target">) | null;
	maxGap?: (number & Aka<"max gap" | "grace">) | null;
};

type Reading = { value: number; unit: string; part?: number };

type StatProps = {
	habits: CollectionGateway<Habit, { list: ListAction }>;
	pick: ValueGateway<unknown, { get: GetAction; update?: UpdateAction }>;
	metric: ValueGateway<string>;
	period: ValueGateway<number>;
};

const CAPS: Record<string, string> = {
	streak: "Streak",
	best: "Best streak",
	total: "Total check-ins",
	rate: "Check-in rate",
	goal: "Goal",
};

// CONTEXT: a goal is a target in the note — `goal: 21` turns a habit into something with an end
function readingOf(metric: string, log: LogEntry[], habit: Habit, period: number, today: string): Reading {
	const streak = streakOf(log, { maxGap: Number(habit?.maxGap ?? 0), today });
	if (metric === "best") return { value: streak.best, unit: "days" };
	if (metric === "total") return { value: log.length, unit: "days" };
	if (metric === "rate") return { value: Math.round((log.length / Math.max(period, 1)) * 100), unit: "%" };
	if (metric === "goal") {
		const goal = Number(habit?.goal ?? 0);
		return { value: streak.current, unit: goal > 0 ? `of ${goal} days` : "days", part: goal > 0 ? Math.min(1, streak.current / goal) : 0 };
	}
	return { value: streak.current, unit: "days" };
}

export default createWidget(function HabitStat({ pick, metric: asked, period: lookback, habits }: StatProps) {
	const listedRows = useData(habits.list);
	const rows = flatRows(listedRows.rows);
	const picked = pickedValue(useData(pick.get).data);
	const habit = rows.find((row) => row.name === picked) ?? rows[0];
	const today = isoOf(new Date());
	const period = Math.max(1, Number(useData(lookback.get).data) || 30);
	const named = String(useData(asked.get).data ?? "");
	const metric = CAPS[named] ? named : "streak";

	if (!habit) {
		return (
			<WidgetRoot className="habit-stat">
				<style>{STYLE}</style>
				<span className="hs-cap">{CAPS[metric]}</span>
				<span className="habit-sub">no habit named {picked || "anything"}</span>
			</WidgetRoot>
		);
	}

	const log = readLog([habit], { pick: habit.name });
	const reading = readingOf(metric, log, habit, period, today);

	return (
		<WidgetRoot className="habit-stat" style={habit.color ? { "--habit-ink": habit.color } : undefined}>
			<style>{STYLE}</style>
			<span className="hs-cap">{`${CAPS[metric]} · ${habit.title ?? habit.name}`}</span>
			<span className="hs-value">
				{reading.value}
				<span className="hs-unit">{reading.unit}</span>
			</span>
			{reading.part === undefined ? null : (
				<span className="hs-bar">
					<i className="hs-fill" style={{ width: `${Math.round(reading.part * 100)}%` }} />
				</span>
			)}
		</WidgetRoot>
	);
}, {
	props: {
		habits: {
			label: "Habits",
			default: { path: "Habits" },
		},
		pick: {
			label: "Which habit",
			hint: "The habit this number is about.",
			of: "habits",
			field: "name",
			fallback: "first",
		},
		metric: {
			wasSetting: true,
			type: "text",
			label: "streak · best · total · rate · goal",
			default: { value: "streak" },
		},
		period: {
			wasSetting: true,
			type: "number",
			label: "Days the rate looks back over",
			default: { value: 30 },
		},
	},
});
