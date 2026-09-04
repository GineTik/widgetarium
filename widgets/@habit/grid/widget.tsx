import { flatRows, createWidget, useData, WidgetRoot } from "widgetarium";
import type { Aka, CollectionGateway, Day, ListAction, Text, UpdateAction, VaultRecord } from "widgetarium";
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
	const days: string[] = [];
	const day = new Date();
	for (let at = count - 1; at >= 0; at -= 1) {
		const when = new Date(day);
		when.setDate(day.getDate() - at);
		days.push(isoOf(when));
	}
	return days;
}

type Habit = VaultRecord & {
	days: Day[] & Aka<"entries" | "dates" | "log" | "checkins" | "done">;
	title?: Text & Aka<"name">;
	color?: Text & Aka<"colour">;
	goal?: number & Aka<"target">;
	maxGap?: number;
};

type Accesses = {
	list: ListAction;
	update?: UpdateAction;
};

function toHabit(row) {
	return {
		name: row.name,
		title: row.title ?? row.name,
		color: row.color ?? "",
		maxGap: row.maxGap,
		goal: row.goal,
		entries: row.days ?? [],
	};
}

export default createWidget(function HabitGrid({
	settings,
	habits,
	slots,
}: {
	settings: any;
	habits: CollectionGateway<Habit, Accesses>;
	slots: any;
}) {
	const listedRows = useData(habits.list);
	const rows = flatRows(listedRows.rows);
	const days = lastDays(Math.max(1, Math.min(60, Number(settings.days) || 14)));
	const today = isoOf(new Date());
	const canWrite = habits.update.can().can === true;

	const toggle = async (row, date) => {
		if (!canWrite) return;
		const held = row.days ?? [];
		const next = held.includes(date) ? held.filter((each) => each !== date) : [...held, date].sort();
		await habits.update({ ref: row.ref, data: { days: next } });
	};

	const Row = slots?.row;

	return (
		<WidgetRoot className="habit-grid">
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
								habit={{ ...toHabit(row), maxGap: row.maxGap ?? (Number(settings.maxGap) || 0) }}
								days={days}
								today={today}
								isSquare={Boolean(settings.isSquare)}
								onToggle={(date) => toggle(row, date)}
							/>
						) : null,
					)}
				</div>
			)}
		</WidgetRoot>
	);
});
