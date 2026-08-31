import { createWidget, WidgetRoot } from "widgetarium";
import { isoOf, readLog, streakOf } from "@habit/lib";

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

const CAPS = {
	streak: "Streak",
	best: "Best streak",
	total: "Total check-ins",
	rate: "Check-in rate",
	goal: "Goal",
};

// CONTEXT: a goal is a target in the note — `goal: 21` turns a habit into something with an end
function readingOf(metric, log, habit, period, today) {
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

export default createWidget(function HabitStat({ settings, data }) {
	const rows = data?.habits?.rows ?? [];
	const field = settings.field || "entries";
	const habit = rows.find((row) => row.name === settings.pick) ?? rows[0];
	const today = isoOf(new Date());
	const period = Math.max(1, Number(settings.period) || 30);
	const metric = CAPS[settings.metric] ? settings.metric : "streak";

	if (!habit) {
		return (
			<WidgetRoot className="habit-stat">
				<style>{STYLE}</style>
				<span className="hs-cap">{CAPS[metric]}</span>
				<span className="habit-sub">no habit named {settings.pick || "anything"}</span>
			</WidgetRoot>
		);
	}

	const log = readLog([habit], { field, pick: habit.name });
	const reading = readingOf(metric, log, habit.props, period, today);

	return (
		<WidgetRoot className="habit-stat" style={habit.props?.color ? { "--habit-ink": habit.props.color } : undefined}>
			<style>{STYLE}</style>
			<span className="hs-cap">{`${CAPS[metric]} · ${habit.props?.title ?? habit.name}`}</span>
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
});
