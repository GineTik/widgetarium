import { createWidget, WidgetRoot } from "widgetarium";
import { isoOf } from "@habit/lib";

const STYLE = `
.habit-grid {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-3, 12px);
	overflow: auto;
}

.hg-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--size-4-2, 8px);
	padding: 0 var(--size-4-3, 12px);
}

.hg-title {
	margin: 0;
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
}

.hg-rows {
	display: flex;
	flex-direction: column;
	gap: 2px;
}
`;

// CONTEXT: the newest day sits last, the way a week reads
function lastDays(count) {
	const days = [];
	const day = new Date();
	for (let at = count - 1; at >= 0; at -= 1) {
		const when = new Date(day);
		when.setDate(day.getDate() - at);
		days.push(isoOf(when));
	}
	return days;
}

function toHabit(row, field) {
	return {
		name: row.name,
		title: row.props?.title ?? row.name,
		color: row.props?.color ?? "",
		maxGap: row.props?.maxGap,
		goal: row.props?.goal,
		entries: (row.props?.[field] ?? []).filter((date) => typeof date === "string"),
	};
}

export default createWidget(function HabitGrid({ settings, data, actions, slots }) {
	const rows = data?.habits?.rows ?? [];
	const field = settings.field || "entries";
	const days = lastDays(Math.max(1, Math.min(60, Number(settings.days) || 14)));
	const today = isoOf(new Date());
	const write = actions?.habits;

	// CONTEXT: one writer for `entries` — the row raises the press, the board owns the write
	const toggle = async (row, date) => {
		if (!write?.canUpdate) return;
		const held = (row.props?.[field] ?? []).filter((each) => typeof each === "string");
		const next = held.includes(date) ? held.filter((each) => each !== date) : [...held, date].sort();
		await write.update({ path: row.path }, { props: { [field]: next } });
	};

	const Row = slots?.row;

	return (
		<WidgetRoot background="var(--wg-kit-fill)" className="habit-grid">
			<style>{STYLE}</style>
			<div className="hg-head">
				<h3 className="hg-title">Habits</h3>
				<span className="habit-sub">{`${days.length} days`}</span>
			</div>
			{rows.length === 0 ? (
				<p className="habit-empty">No habit notes in this folder yet. A habit is a note with a list of dates in it.</p>
			) : (
				<div className="hg-rows">
					{rows.map((row) =>
						Row ? (
							<Row
								key={row.path}
								habit={{ ...toHabit(row, field), maxGap: row.props?.maxGap ?? (Number(settings.maxGap) || 0) }}
								days={days}
								today={today}
								square={Boolean(settings.square)}
								onToggle={(date) => toggle(row, date)}
							/>
						) : null,
					)}
				</div>
			)}
		</WidgetRoot>
	);
});
