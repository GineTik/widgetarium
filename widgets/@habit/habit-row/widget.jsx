import { createWidget } from "widgetarium";
import { streakOf } from "@habit/lib";

const STYLE = `
.habit-row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--size-4-3, 12px);
	padding: var(--size-4-2, 8px) var(--size-4-3, 12px);
	border-radius: var(--wg-kit-item, 8px);
}

.habit-row:hover {
	background: var(--background-modifier-hover);
}

.hr-days {
	display: flex;
	gap: 6px;
	align-items: center;
}

.hr-days .habit-dot {
	width: 18px;
	min-width: 18px;
}
`;

// CONTEXT: a fed slot owns nothing — the parent hands the habit down and takes the press back
export default createWidget(function HabitRow({ habit, days = [], today = "", square = false, onToggle }) {
	const marked = new Set(habit?.entries ?? []);
	const streak = streakOf([...marked].map((date) => ({ date })), { maxGap: habit?.maxGap ?? 0, today });
	const goal = Number(habit?.goal ?? 0);

	return (
		<div className="habit-row" style={habit?.color ? { "--habit-ink": habit.color } : undefined}>
			<style>{STYLE}</style>
			<span className="habit-what">
				<span className="habit-name">{habit?.title ?? habit?.name ?? "Untitled"}</span>
				<span className="habit-sub">{goal > 0 ? `${streak.current} / ${goal} days` : `streak ${streak.current} · best ${streak.best}`}</span>
			</span>
			<span className="hr-days">
				{days.map((date) => (
					<button
						type="button"
						key={date}
						className={`habit-dot${square ? " is-square" : ""}${marked.has(date) ? " is-done" : ""}${date === today ? " is-today" : ""}`}
						title={date}
						aria-pressed={marked.has(date)}
						onClick={() => onToggle?.(date)}
					/>
				))}
			</span>
		</div>
	);
});
