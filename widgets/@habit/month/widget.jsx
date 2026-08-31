import { createWidget, WidgetRoot } from "widgetarium";
import { useState } from "react";
import { IconButton, Icon } from "widgetarium/kit";
import { isoOf } from "@habit/lib";

const STYLE = `
.habit-month {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-3, 12px);
	overflow: auto;
}

.hm-head {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--size-4-2, 8px);
}

.hm-back {
	transform: rotate(180deg);
}

.hm-name {
	text-align: center;
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
}

.hm-week,
.hm-days {
	display: grid;
	grid-template-columns: repeat(7, minmax(0, 1fr));
	gap: var(--size-4-2, 8px);
}

.hm-week span {
	text-align: center;
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.hm-day {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
}

.hm-num {
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
}

.hm-day.is-outside .hm-num {
	opacity: 0.35;
}
`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const FROM_MONDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FROM_SUNDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// CONTEXT: a month grid shows the days around it too, or the first week has holes in it
function monthDays(year, month, startMonday) {
	const first = new Date(year, month, 1);
	const lead = startMonday ? (first.getDay() + 6) % 7 : first.getDay();
	const days = [];
	for (let at = lead; at > 0; at -= 1) {
		const when = new Date(year, month, 1 - at);
		days.push({ iso: isoOf(when), day: when.getDate(), outside: true });
	}
	for (const when = new Date(year, month, 1); when.getMonth() === month; when.setDate(when.getDate() + 1)) {
		days.push({ iso: isoOf(when), day: when.getDate(), outside: false });
	}
	while (days.length % 7 !== 0) {
		const when = new Date(year, month + 1, days.length - lead - new Date(year, month + 1, 0).getDate() + 1);
		days.push({ iso: isoOf(when), day: when.getDate(), outside: true });
	}
	return days;
}

export default createWidget(function HabitMonth({ settings, data, actions }) {
	const [shift, setShift] = useState(0);
	const rows = data?.habits?.rows ?? [];
	const field = settings.field || "entries";
	const habit = rows.find((row) => row.name === settings.pick) ?? rows[0];
	const write = actions?.habits;

	const now = new Date();
	const shown = new Date(now.getFullYear(), now.getMonth() + shift, 1);
	const today = isoOf(now);
	const startMonday = settings.startMonday !== false;
	const days = monthDays(shown.getFullYear(), shown.getMonth(), startMonday);
	const marked = new Set(habit?.props?.[field] ?? []);

	const toggle = async (iso) => {
		if (!write?.canUpdate || !habit) return;
		const held = (habit.props?.[field] ?? []).filter((each) => typeof each === "string");
		const next = held.includes(iso) ? held.filter((each) => each !== iso) : [...held, iso].sort();
		await write.update({ path: habit.path }, { props: { [field]: next } });
	};

	return (
		<WidgetRoot className="habit-month" style={habit?.props?.color ? { "--habit-ink": habit.props.color } : undefined}>
			<style>{STYLE}</style>
			<div className="hm-head">
				<IconButton size="s" label="Previous month" onClick={() => setShift(shift - 1)}>
					<Icon name="chevron" size={15} className="hm-back" />
				</IconButton>
				<span className="hm-name">{`${MONTHS[shown.getMonth()]} ${shown.getFullYear()}`}</span>
				<IconButton size="s" label="Next month" onClick={() => setShift(shift + 1)}>
					<Icon name="chevron" size={15} />
				</IconButton>
			</div>
			{habit ? null : <p className="habit-empty">No habit named {settings.pick || "anything"} in this folder.</p>}
			<div className="hm-week">
				{(startMonday ? FROM_MONDAY : FROM_SUNDAY).map((name) => (
					<span key={name}>{name}</span>
				))}
			</div>
			<div className="hm-days">
				{days.map((day) => (
					<span className={`hm-day${day.outside ? " is-outside" : ""}`} key={day.iso}>
						<span className="hm-num">{day.day}</span>
						<button
							type="button"
							className={`habit-dot${marked.has(day.iso) ? " is-done" : ""}${day.iso === today ? " is-today" : ""}`}
							title={day.iso}
							aria-pressed={marked.has(day.iso)}
							disabled={!habit}
							onClick={() => toggle(day.iso)}
						/>
					</span>
				))}
			</div>
		</WidgetRoot>
	);
});
