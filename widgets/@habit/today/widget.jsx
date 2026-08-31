import { createWidget, WidgetRoot } from "widgetarium";
import { isoOf, streakOf } from "@habit/lib";

const STYLE = `
.habit-today {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-3, 12px);
	overflow: auto;
}

.ht-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--size-4-2, 8px);
}

.ht-title {
	margin: 0;
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
}

.ht-row {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--size-4-3, 12px);
	padding: var(--size-4-2, 8px) 0;
}

.ht-row + .ht-row {
	border-top: 1px solid var(--background-modifier-border);
}

.ht-mark {
	width: 26px;
	min-width: 26px;
}

.ht-back {
	display: flex;
	gap: 4px;
}

.ht-back .habit-dot {
	width: 8px;
	min-width: 8px;
	cursor: default;
}
`;

// CONTEXT: today last, so the row reads left to right and ends where the press belongs
function lastDays(count) {
	const days = [];
	const day = new Date();
	for (let at = count; at >= 1; at -= 1) {
		const when = new Date(day);
		when.setDate(day.getDate() - at);
		days.push(isoOf(when));
	}
	return days;
}

export default createWidget(function HabitToday({ settings, data, actions }) {
	const rows = data?.habits?.rows ?? [];
	const field = settings.field || "entries";
	const today = isoOf(new Date());
	const behind = lastDays(Math.max(1, Math.min(21, Number(settings.days) || 7)));
	const write = actions?.habits;
	const kept = rows.filter((row) => (row.props?.[field] ?? []).includes(today)).length;

	const toggle = async (row) => {
		if (!write?.canUpdate) return;
		const held = (row.props?.[field] ?? []).filter((each) => typeof each === "string");
		const next = held.includes(today) ? held.filter((each) => each !== today) : [...held, today].sort();
		await write.update({ path: row.path }, { props: { [field]: next } });
	};

	return (
		<WidgetRoot className="habit-today">
			<style>{STYLE}</style>
			<div className="ht-head">
				<h3 className="ht-title">Today</h3>
				<span className="habit-sub">{`${kept} of ${rows.length}`}</span>
			</div>
			{rows.length === 0 ? (
				<p className="habit-empty">No habit notes in this folder yet.</p>
			) : (
				rows.map((row) => {
					const marked = new Set(row.props?.[field] ?? []);
					const streak = streakOf([...marked].map((date) => ({ date })), { maxGap: Number(row.props?.maxGap ?? 0), today });
					return (
						<div className="ht-row" key={row.path} style={row.props?.color ? { "--habit-ink": row.props.color } : undefined}>
							<button
								type="button"
								className={`habit-dot ht-mark${marked.has(today) ? " is-done" : ""}`}
								aria-pressed={marked.has(today)}
								title={`${row.props?.title ?? row.name} — today`}
								onClick={() => toggle(row)}
							/>
							<span className="habit-what">
								<span className="habit-name">{row.props?.title ?? row.name}</span>
								<span className="habit-sub">{`streak ${streak.current}`}</span>
							</span>
							<span className="ht-back">
								{behind.map((date) => (
									<span key={date} className={`habit-dot${marked.has(date) ? " is-done" : ""}`} title={date} />
								))}
							</span>
						</div>
					);
				})
			)}
		</WidgetRoot>
	);
});
