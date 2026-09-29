import {
	ICrudGateway,
	IValueGateway,
	VaultRecordSchema,
	canDo,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { useRef } from "react";
import { daysLogged, isoOf, pressing, shiftBy, streakOf } from "@default/lib";
import { DayButton } from "./day-button";
import { Summary } from "./summary";
import type { DayColumn } from "./types";
import { useWidth } from "./use-width";

const COLUMN_PX = 44;
const RING_PX = 36;
const SEAT_PX = 40;
const CONNECTOR_PX = 12;

const STYLE = `
.habit-streak {
	display: flex;
	flex-direction: column;
	justify-content: space-evenly;
	overflow: hidden;
	padding: 0;
}

.hs-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding-inline: calc(${CONNECTOR_PX}px + (var(--hs-column) - ${RING_PX}px) / 2);
	height: 22px;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--wg-kit-text);
}

.hs-title {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}

.hs-title > span {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.hs-count {
	display: flex;
	flex: none;
	align-items: center;
	gap: 6px;
}

.hs-count .hs-flame {
	color: var(--interactive-accent);
	flex: none;
}

.hs-count.is-cold,
.hs-count.is-cold .hs-flame {
	color: var(--text-faint);
}

.hs-rail {
	display: flex;
	width: 100%;
	align-items: stretch;
}

.hs-edge {
	flex: none;
	width: ${CONNECTOR_PX}px;
	align-self: end;
	height: ${SEAT_PX}px;
	background: transparent;
}

.hs-edge.is-run {
	background: var(--wg-kit-accent-wash);
}

/* TRADE-OFF: doubled selector for (0,2,0) — the host paints bare buttons at (0,1,1) and outranks one class */
.habit-streak .hs-day,
.habit-streak .hs-day:hover {
	flex: none;
	width: var(--hs-column);
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: none;
	box-shadow: none;
	cursor: pointer;
	color: var(--wg-kit-text);
}

.habit-streak .hs-day[disabled] {
	cursor: default;
}

.hs-head {
	display: grid;
	height: 18px;
	place-items: center;
	font-size: var(--font-ui-smaller, 13px);
	font-weight: var(--font-medium, 500);
	line-height: 18px;
}

.hs-head > span {
	grid-area: 1 / 1;
}

.hs-head > span {
	transition: opacity 160ms ease, transform 160ms ease;
}

.hs-date {
	opacity: 0;
	transform: translateY(5px);
}

.hs-day:hover .hs-name {
	opacity: 0;
	transform: translateY(-5px);
}

.hs-day:hover .hs-date {
	opacity: 1;
	transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
	.hs-head > span {
		transition: none;
	}
}

.hs-seat {
	width: 100%;
	height: ${SEAT_PX}px;
	display: grid;
	place-items: center;
}

.hs-seat.is-run {
	background: var(--wg-kit-accent-wash);
}

.hs-seat.is-run-start {
	border-start-start-radius: 999px;
	border-end-start-radius: 999px;
}

.hs-seat.is-run-end {
	border-start-end-radius: 999px;
	border-end-end-radius: 999px;
}

.hs-ring {
	width: ${RING_PX}px;
	height: ${RING_PX}px;
	display: grid;
	place-items: center;
	border: 2px solid var(--text-faint);
	border-radius: 50%;
	background: var(--background-primary);
	color: var(--interactive-accent);
}

.hs-ring.is-kept {
	border-color: var(--interactive-accent);
}

.hs-ring.is-today {
	border-color: var(--wg-kit-text);
}

.hs-flame {
	fill: currentColor;
}
`;

const DayNoteSchema = VaultRecordSchema.extend({
	path: z.string(),
	name: z.string(),
	done: z
		.number()
		.nullable()
		.optional()
		.meta({ aka: ["kept", "value", "count", "steps", "amount", "score"] }),
	date: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["created", "day", "when", "on"] }),
});

function columnsAcrossFullWidth(railWidth: number) {
	return Math.max(1, Math.floor(railWidth / COLUMN_PX));
}

function columnWidth(railWidth: number, columns: number) {
	return Math.max(RING_PX, (railWidth - 2 * CONNECTOR_PX) / columns);
}

function daysAround(today: string, count: number) {
	const daysBehindToday = Math.ceil((count - 1) / 2);
	const days: string[] = [];
	for (let at = -daysBehindToday; days.length < count; at += 1) days.push(shiftBy(today, at));
	return days;
}

function seatClass(keptDays: Set<string>, day: string) {
	if (!keptDays.has(day)) return "hs-seat";
	const opens = keptDays.has(shiftBy(day, -1)) ? "" : " is-run-start";
	const closes = keptDays.has(shiftBy(day, 1)) ? "" : " is-run-end";
	return `hs-seat is-run${opens}${closes}`;
}

function ringClass(day: string, kept: boolean, today: string) {
	if (kept) return "hs-ring is-kept";
	return day === today ? "hs-ring is-today" : "hs-ring";
}

function edgeClass(keptDays: Set<string>, day: string | undefined, towards: number) {
	if (!day) return "hs-edge";
	return keptDays.has(day) && keptDays.has(shiftBy(day, towards)) ? "hs-edge is-run" : "hs-edge";
}

function dayColumns(shown: string[], keptDays: Set<string>, today: string, canWrite: boolean): DayColumn[] {
	return shown.map((day) => {
		const kept = keptDays.has(day);
		return {
			day,
			kept,
			seat: seatClass(keptDays, day),
			ring: ringClass(day, kept, today),
			canPress: canWrite && day <= today,
		};
	});
}

const HabitStreak = createWidget({
	inject: {
		days: ICrudGateway.of(DayNoteSchema).pick("list", "update", "create"),
		title: IValueGateway.of(z.string().default("Habit")).pick("get"),
		emoji: IValueGateway.of(z.string().default("smiling-face-with-halo")).pick("get"),
	},
	draw: ({ days, title, emoji }) => {
		const rail = useRef<HTMLDivElement | null>(null);
		const railWidth = useWidth(rail, 7 * COLUMN_PX);
		const today = isoOf(new Date());

		const listed = useData(days.list);
		const { noteByDay, keptDays } = daysLogged(listed.data);

		const shown = daysAround(today, columnsAcrossFullWidth(railWidth));
		const columnPx = columnWidth(railWidth, shown.length);
		const streak = streakOf(
			[...keptDays].map((date) => ({ date })),
			{ today },
		);
		const press = pressing({ days, noteByDay, keptDays });
		const columns = dayColumns(shown, keptDays, today, canDo(days.update) && canDo(days.create));

		return (
			<div className="habit-streak" style={{ "--hs-column": `${columnPx}px` } as Record<string, string>}>
				<style>{STYLE}</style>
				<Summary habitName={title} face={emoji} count={streak.current} />
				<div className="hs-rail" ref={rail}>
					<i className={edgeClass(keptDays, shown[0], -1)} />
					{columns.map((column) => (
						<DayButton key={column.day} column={column} onPress={() => press(column.day)} />
					))}
					<i className={edgeClass(keptDays, shown[shown.length - 1], 1)} />
				</div>
			</div>
		);
	},
});

export const metadata = defineMetadata(HabitStreak, {
	title: "Habit streak",
	description: "The days around today as a run of rings, each one a press away from kept.",
	keywords: ["streak", "days", "row", "week", "run", "fire", "flame", "daily", "habit", "tracker", "keep", "press"],
	preview: {
		size: { w: 8, h: 2 },
		props: {
			title: { value: "Meditation" },
			emoji: { value: "smiling-face-with-halo" },
			days: {
				rows: [
					{ path: "Habits/2026-08-24.md", done: 1 },
					{ path: "Habits/2026-08-25.md", done: 1 },
					{ path: "Habits/2026-08-27.md", done: 1 },
					{ path: "Habits/2026-08-28.md", done: 1 },
					{ path: "Habits/2026-08-29.md", done: 1 },
					{ path: "Habits/2026-08-30.md", done: 1 },
					{ path: "Habits/2026-08-31.md", done: 1 },
					{ path: "Habits/2026-09-01.md", done: 1 },
				],
			},
		},
		shot: { of: "499947623" },
	},
	props: {
		days: {
			aka: ["habits"],
			describes: {
				done: { type: "number" },
				date: { type: "date" },
			},
		},
		title: {
			label: "Habit name",
			hint: "What is written beside the emoji. Type one here, or take it from another widget's value.",
		},
		emoji: {
			hint: "A Fluent emoji by name, such as smiling-face-with-halo. A name nobody drew leaves the row bare.",
			control: "emoji",
		},
	},
});

export const layout = defineLayout({
	role: "indicator",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 170, stackBelowPx: 260 },
});

export default HabitStreak;
