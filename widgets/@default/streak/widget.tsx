import { canDo, createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { Aka, Day, VaultRecord } from "widgetarium";
import { Emoji } from "widgetarium/kit/emojis";
import { useEffect, useRef, useState } from "react";
import { daysLogged, FLAME, isoOf, pressing, shiftedBy, streakOf } from "@default/lib";

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
	color: var(--text-normal);
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
	color: var(--text-normal);
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
	border-color: var(--text-normal);
}

.hs-flame {
	fill: currentColor;
}
`;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const ONE_DAY = "{count} day";
const MANY_DAYS = "{count} days";
const A_KEPT_DAY = "{date}, kept";
const AN_OPEN_DAY = "{date}, not kept";

function filled(sentence: string, values: Record<string, string>) {
	return Object.entries(values).reduce((held, [name, value]) => held.replace(`{${name}}`, value), sentence);
}

type DayNote = VaultRecord & {
	done?: (number & Aka<"kept" | "value" | "count" | "steps" | "amount" | "score">) | null;
	date?: (Day & Aka<"created" | "day" | "when" | "on">) | null;
	props?: Record<string, unknown>;
};

type DayColumn = {
	day: string;
	kept: boolean;
	seat: string;
	ring: string;
	canPress: boolean;
};

function weekdayOf(iso: string) {
	return WEEKDAYS[new Date(Date.parse(`${iso}T00:00:00Z`)).getUTCDay()];
}

function columnsAcrossFullWidth(railWidth: number) {
	return Math.max(1, Math.floor(railWidth / COLUMN_PX));
}

function columnWidth(railWidth: number, columns: number) {
	return Math.max(RING_PX, (railWidth - 2 * CONNECTOR_PX) / columns);
}

function daysAround(today: string, count: number) {
	const daysBehindToday = Math.ceil((count - 1) / 2);
	const days: string[] = [];
	for (let at = -daysBehindToday; days.length < count; at += 1) days.push(shiftedBy(today, at));
	return days;
}

function seatClass(keptDays: Set<string>, day: string) {
	if (!keptDays.has(day)) return "hs-seat";
	const opens = keptDays.has(shiftedBy(day, -1)) ? "" : " is-run-start";
	const closes = keptDays.has(shiftedBy(day, 1)) ? "" : " is-run-end";
	return `hs-seat is-run${opens}${closes}`;
}

function ringClass(day: string, kept: boolean, today: string) {
	if (kept) return "hs-ring is-kept";
	return day === today ? "hs-ring is-today" : "hs-ring";
}

function edgeClass(keptDays: Set<string>, day: string | undefined, towards: number) {
	if (!day) return "hs-edge";
	return keptDays.has(day) && keptDays.has(shiftedBy(day, towards)) ? "hs-edge is-run" : "hs-edge";
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

function useWidth(node: { current: HTMLElement | null }, fallback: number) {
	const [width, setWidth] = useState(fallback);
	useEffect(() => {
		const held = node.current;
		if (!held || typeof ResizeObserver !== "function") return undefined;
		const watcher = new ResizeObserver(([entry]) => {
			if (entry) setWidth(entry.contentRect.width);
		});
		watcher.observe(held);
		return () => watcher.disconnect();
	}, []);
	return width;
}

function Flame({ size }: { size: number }) {
	return (
		<svg className="hs-flame" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
			<path fillRule="evenodd" clipRule="evenodd" d={FLAME} />
		</svg>
	);
}

function DayButton({ column, onPress }: { column: DayColumn; onPress: () => void }) {
	return (
		<button
			type="button"
			className="hs-day"
			disabled={!column.canPress}
			aria-pressed={column.kept}
			aria-label={filled(column.kept ? A_KEPT_DAY : AN_OPEN_DAY, { date: column.day })}
			onClick={onPress}
		>
			<span className="hs-head">
				<span className="hs-name">{weekdayOf(column.day)}</span>
				<span className="hs-date">{Number(column.day.slice(8))}</span>
			</span>
			<span className={column.seat}>
				<span className={column.ring}>{column.kept ? <Flame size={22} /> : null}</span>
			</span>
		</button>
	);
}

function Summary({ habitName, face, count }: { habitName: string; face: string; count: number }) {
	return (
		<div className="hs-top">
			<div className="hs-title">
				<Emoji name={face} size={18} />
				<span>{habitName}</span>
			</div>
			<div className={`hs-count${count === 0 ? " is-cold" : ""}`}>
				<Flame size={16} />
				<span>{filled(count === 1 ? ONE_DAY : MANY_DAYS, { count: String(count) })}</span>
			</div>
		</div>
	);
}

export const manifest = defineManifest({
	title: "Habit streak",
	description: "The days around today as a run of rings, each one a press away from kept.",
	keywords: ["streak", "days", "row", "week", "run", "fire", "flame", "daily", "habit", "tracker", "keep", "press"],
	role: "indicator",
	size: { collapseBelowPx: 170, stackBelowPx: 260, tallestPx: 110, shortestPx: 110 },
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
		days: defineProp<DayNote[]>()({
			label: "Days",
			aka: ["habits"],
			default: [],
			writes: ["update", "create"],
			describes: {
				done: { type: "number", aka: ["kept", "value", "count", "steps", "amount", "score"] },
				date: { type: "date", aka: ["created", "day", "when", "on"] },
			},
		}),
		title: defineProp<string>()({
			label: "Habit name",
			hint: "What is written beside the emoji. Type one here, or take it from another widget's value.",
			default: "Habit",
		}),
		emoji: defineProp<string>()({
			label: "Emoji",
			hint: "A Fluent emoji by name, such as smiling-face-with-halo. A name nobody drew leaves the row bare.",
			control: "emoji",
			default: "smiling-face-with-halo",
		}),
	},
});

export default createWidget(manifest, ({ days, title, emoji }) => {
	const rail = useRef<HTMLDivElement | null>(null);
	const railWidth = useWidth(rail, 7 * COLUMN_PX);
	const today = isoOf(new Date());

	const listed = useData(days.list);
	const habitName = String(useData(title.get).data ?? "");
	const face = String(useData(emoji.get).data ?? "");
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
			<Summary habitName={habitName} face={face} count={streak.current} />
			<div className="hs-rail" ref={rail}>
				<i className={edgeClass(keptDays, shown[0], -1)} />
				{columns.map((column) => (
					<DayButton key={column.day} column={column} onPress={() => press(column.day)} />
				))}
				<i className={edgeClass(keptDays, shown[shown.length - 1], 1)} />
			</div>
		</div>
	);
});
