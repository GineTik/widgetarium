import { canDo, createWidget, defineManifest, defineProp, pickedValue, useData } from "widgetarium";
import type { Aka, Day, Text, VaultRecord, WidgetProps } from "widgetarium";
import { useEffect, useRef, useState } from "react";
import { Icon, IconButton } from "widgetarium/kit";
import { daysLogged, FLAME, isoOf, leadDaysOf, pressing, shapeOf } from "@default/lib";

const ALL_DAYS = 2000;

const ACROSS = 7;
const MOST_WEEKS = 6;

const DAY_NUMBER_SHARE = 0.56;
const NUMBER_GAP_SHARE = 0.12;
const SEAT_SHARE = 1.16;
const ROW_GAP_SHARE = 0.36;
const WEEKDAY_ROW_SHARE = 0.52;
const WEEKDAY_GAP_SHARE = 0.5;
const RUN_OVERHANG_PX = 1;
const COLUMN_FILL = 0.8;
const FLAME_SHARE = 0.6;
const SMALLEST_RING_PX = 9;
const LARGEST_RING_PX = 46;

const STYLE = `
.habit-month {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-parts, 16px);
	overflow: hidden;
}

.hm-head {
	flex: none;
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--size-4-2, 8px);
}

.hm-flip {
	transform: rotate(180deg);
}

.hm-mid {
	display: flex;
	flex-direction: column;
	align-items: center;
	min-width: 0;
}

.hm-note {
	max-width: 100%;
	font-size: max(10px, min(var(--font-ui-smaller, 12px), calc(var(--hm-ring) * 0.46)));
	color: var(--wg-kit-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hm-title {
	text-align: center;
	font-size: max(11px, min(var(--font-ui-medium, 15px), calc(var(--hm-ring) * 0.62)));
	font-weight: var(--font-semibold, 600);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hm-room {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	gap: var(--hm-weekday-gap);
}

.hm-weekdays,
.hm-days {
	flex: none;
	display: grid;
	grid-template-columns: repeat(${ACROSS}, minmax(0, 1fr));
	margin-inline: calc((100% - ${ACROSS} * (var(--hm-ring) + ${2 * RUN_OVERHANG_PX}px)) / -${2 * (ACROSS - 1)});
}

.hm-days {
	grid-auto-rows: auto;
	row-gap: var(--hm-gap);
}

.hm-weekday {
	display: grid;
	place-items: center;
	height: var(--hm-weekday);
	font-size: calc(var(--hm-weekday) * 0.72);
	font-weight: var(--font-medium, 500);
	line-height: 1;
	color: var(--text-faint);
}

/* TRADE-OFF: doubled selector for (0,2,0) — the host paints bare buttons at (0,1,1) and outranks one class */
.habit-month .hm-day,
.habit-month .hm-day:hover {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--hm-number-gap);
	height: auto;
	min-height: 0;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: none;
	box-shadow: none;
	cursor: pointer;
	color: var(--wg-kit-text);
}

.habit-month .hm-day[disabled] {
	cursor: default;
}

.hm-number {
	flex: none;
	height: var(--hm-number);
	font-size: calc(var(--hm-number) * 0.74);
	line-height: var(--hm-number);
	font-weight: var(--font-medium, 500);
	font-variant-numeric: tabular-nums;
}

.hm-day.is-outside .hm-number {
	color: var(--text-faint);
}

.hm-day.is-ahead {
	opacity: 0.38;
}

.hm-seat {
	flex: none;
	width: 100%;
	height: var(--hm-seat);
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	place-items: center;
}

.hm-run {
	grid-area: 1 / 1;
	justify-self: stretch;
	align-self: center;
	height: calc(var(--hm-ring) + ${2 * RUN_OVERHANG_PX}px);
	background: var(--wg-kit-accent-wash);
}

.hm-run.is-run-start {
	margin-inline-start: calc(50% - var(--hm-ring) / 2 - 1px);
	border-start-start-radius: 999px;
	border-end-start-radius: 999px;
}

.hm-run.is-run-end {
	margin-inline-end: calc(50% - var(--hm-ring) / 2 - 1px);
	border-start-end-radius: 999px;
	border-end-end-radius: 999px;
}

.hm-ring {
	grid-area: 1 / 1;
	box-sizing: border-box;
	width: var(--hm-ring);
	height: var(--hm-ring);
	display: grid;
	place-items: center;
	border: max(1px, calc(var(--hm-ring) * 0.055)) solid var(--text-faint);
	border-radius: 50%;
	background: var(--background-primary);
	color: var(--interactive-accent);
}

.hm-ring.is-kept {
	border-color: var(--interactive-accent);
}

.hm-ring.is-today {
	border-color: var(--wg-kit-text);
}

.hm-flame {
	fill: currentColor;
}
`;

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const FROM_MONDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FROM_SUNDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const A_DAY = /^\d{4}-\d{2}-\d{2}$/;
const NOTHING_TRACKED = "No habit here yet";
const A_KEPT_DAY = "{date}, kept";
const AN_OPEN_DAY = "{date}, not kept";

function filled(sentence: string, values: Record<string, string>) {
	return Object.entries(values).reduce((held, [name, value]) => held.replace(`{${name}}`, value), sentence);
}

type DayNote = VaultRecord & {
	days?: (Day[] & Aka<"entries" | "dates" | "log" | "checkins">) | null;
	done?: (number & Aka<"kept" | "value" | "count" | "steps" | "amount" | "score">) | null;
	date?: (Day & Aka<"created" | "day" | "when" | "on">) | null;
	title?: (Text & Aka<"name">) | null;
};

type Size = { width: number; height: number };

type MonthDay = {
	day: string;
	dayOfMonth: number;
	isOutside: boolean;
};

type DayCell = MonthDay & {
	kept: boolean;
	run: string;
	ring: string;
	isAhead: boolean;
	canPress: boolean;
};

function daysInSixWeeks(year: number, month: number, isWeekStartingMonday: boolean) {
	const lead = leadDaysOf(new Date(year, month, 1).getDay(), isWeekStartingMonday);
	const days: MonthDay[] = [];
	for (let at = 0; at < MOST_WEEKS * ACROSS; at += 1) {
		const when = new Date(year, month, at - lead + 1);
		days.push({ day: isoOf(when), dayOfMonth: when.getDate(), isOutside: when.getMonth() !== month });
	}
	return days;
}

function ringFor({ width, height }: Size) {
	const perWeek = DAY_NUMBER_SHARE + NUMBER_GAP_SHARE + SEAT_SHARE;
	const weeks = MOST_WEEKS * perWeek + (MOST_WEEKS - 1) * ROW_GAP_SHARE;
	const tallest = height / (WEEKDAY_ROW_SHARE + WEEKDAY_GAP_SHARE + weeks);
	const widest = (width / ACROSS) * COLUMN_FILL - 2 * RUN_OVERHANG_PX;
	return Math.max(SMALLEST_RING_PX, Math.min(LARGEST_RING_PX, tallest, widest));
}

function sizesFor(ring: number) {
	return {
		"--hm-ring": `${ring}px`,
		"--hm-seat": `${ring * SEAT_SHARE}px`,
		"--hm-number": `${ring * DAY_NUMBER_SHARE}px`,
		"--hm-number-gap": `${ring * NUMBER_GAP_SHARE}px`,
		"--hm-gap": `${ring * ROW_GAP_SHARE}px`,
		"--hm-weekday": `${ring * WEEKDAY_ROW_SHARE}px`,
		"--hm-weekday-gap": `${ring * WEEKDAY_GAP_SHARE}px`,
	};
}

function runClass(kept: boolean[], at: number) {
	if (!kept[at]) return "";
	const opens = at % ACROSS !== 0 && kept[at - 1] ? "" : " is-run-start";
	const closes = at % ACROSS !== ACROSS - 1 && kept[at + 1] ? "" : " is-run-end";
	return `hm-run${opens}${closes}`;
}

function ringClass(day: string, kept: boolean, today: string) {
	if (kept) return "hm-ring is-kept";
	return day === today ? "hm-ring is-today" : "hm-ring";
}

function cellsOver(days: MonthDay[], keptDays: Set<string>, today: string, canWrite: boolean): DayCell[] {
	const kept = days.map((each) => keptDays.has(each.day));
	return days.map((each, at) => {
		const isKept = keptDays.has(each.day);
		return {
			...each,
			kept: isKept,
			run: runClass(kept, at),
			ring: ringClass(each.day, isKept, today),
			isAhead: each.day > today,
			canPress: canWrite && each.day <= today,
		};
	});
}

function useSize(node: { current: HTMLElement | null }, fallback: Size) {
	const [box, setBox] = useState(fallback);
	useEffect(() => {
		const held = node.current;
		if (!held || typeof ResizeObserver !== "function") return undefined;
		const watcher = new ResizeObserver(([entry]) => {
			if (entry) setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
		});
		watcher.observe(held);
		return () => watcher.disconnect();
	}, []);
	return box;
}

function Flame({ size }: { size: number }) {
	return (
		<svg className="hm-flame" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
			<path fillRule="evenodd" clipRule="evenodd" d={FLAME} />
		</svg>
	);
}

function DayButton({ cell, flameSize, onPress }: { cell: DayCell; flameSize: number; onPress: () => void }) {
	return (
		<button
			type="button"
			className={`hm-day${cell.isOutside ? " is-outside" : ""}${cell.isAhead ? " is-ahead" : ""}`}
			disabled={!cell.canPress}
			aria-pressed={cell.kept}
			aria-label={filled(cell.kept ? A_KEPT_DAY : AN_OPEN_DAY, { date: cell.day })}
			onClick={onPress}
		>
			<span className="hm-number">{cell.dayOfMonth}</span>
			<span className="hm-seat">
				{cell.run ? <span className={cell.run} /> : null}
				<span className={cell.ring}>{cell.kept ? <Flame size={flameSize} /> : null}</span>
			</span>
		</button>
	);
}

type MonthProps = WidgetProps<typeof manifest>;

function keptDaysOf(habit?: DayNote) {
	const held = Array.isArray(habit?.days) ? habit.days : [];
	const listed = held.map((entry) => String(entry ?? "").slice(0, 10));
	return new Set(listed.filter((entry) => A_DAY.test(entry)));
}

function pressingHabit(days: MonthProps["days"], habit: DayNote | undefined, kept: Set<string>) {
	return async (day: string) => {
		if (!habit) return undefined;
		const held = new Set(kept);
		if (held.has(day)) held.delete(day);
		else held.add(day);
		return days.update({ ref: String(habit.ref), data: { days: [...held].sort() } });
	};
}

function habitNamed(rows: DayNote[], picked: string) {
	return rows.find((row) => String(row.name ?? "") === picked) ?? rows[0];
}

function captionOf(isPerHabit: boolean, habit?: DayNote) {
	if (!isPerHabit) return "";
	if (!habit) return NOTHING_TRACKED;
	return String(habit.title ?? habit.name ?? "");
}

function weekStartsMonday(held: unknown): boolean {
	if (typeof held === "boolean") return held;
	return true;
}

function MonthHead({ shown, caption, onShift }: { shown: Date; caption: string; onShift: (by: number) => void }) {
	return (
		<div className="hm-head">
			<IconButton size="s" label="Previous month" onClick={() => onShift(-1)}>
				<Icon name="chevron" size={15} className="hm-flip" />
			</IconButton>
			<span className="hm-mid">
				<span className="hm-title">{`${MONTHS[shown.getMonth()]} ${shown.getFullYear()}`}</span>
				{caption === "" ? null : <span className="hm-note">{caption}</span>}
			</span>
			<IconButton size="s" label="Next month" onClick={() => onShift(1)}>
				<Icon name="chevron" size={15} />
			</IconButton>
		</div>
	);
}

function WeekdayNames({ isWeekStartingMonday }: { isWeekStartingMonday: boolean }) {
	return (
		<div className="hm-weekdays">
			{(isWeekStartingMonday ? FROM_MONDAY : FROM_SUNDAY).map((name) => (
				<span className="hm-weekday" key={name}>
					{name}
				</span>
			))}
		</div>
	);
}

export const manifest = defineManifest({
	title: "Habit month",
	description: "The month as a grid of rings, each day a press away from kept.",
	keywords: [
		"month",
		"calendar",
		"habit",
		"days",
		"grid",
		"press",
		"ring",
		"flame",
		"tracker",
		"dates",
		"weeks",
		"log",
	],
	role: "indicator",
	size: { preferredWidth: 420, preferredHeight: 420, keepsRatio: true, at: [{ belowPx: 520, preferredWidth: "full" }], collapseBelowPx: 220, stackBelowPx: 280 },
	preview: {
		size: { w: 6, h: 6 },
		props: {
			days: {
				rows: [
					{ path: "Habits/2026-08-31.md", done: 1 },
					{ path: "Habits/2026-09-01.md", done: 1 },
					{ path: "Habits/2026-09-02.md", done: 1 },
					{ path: "Habits/2026-09-05.md", done: 1 },
					{ path: "Habits/2026-09-06.md", done: 1 },
					{ path: "Habits/2026-09-09.md", done: 1 },
					{ path: "Habits/2026-09-10.md", done: 1 },
					{ path: "Habits/2026-09-11.md", done: 1 },
					{ path: "Habits/2026-09-12.md", done: 1 },
					{ path: "Habits/2026-09-16.md", done: 1 },
					{ path: "Habits/2026-09-17.md", done: 1 },
					{ path: "Habits/2026-09-20.md", done: 1 },
					{ path: "Habits/2026-09-21.md", done: 1 },
					{ path: "Habits/2026-09-22.md", done: 1 },
					{ path: "Habits/2026-09-23.md", done: 1 },
					{ path: "Habits/2026-09-26.md", done: 1 },
					{ path: "Habits/2026-09-27.md", done: 1 },
					{ path: "Habits/2026-09-29.md", done: 1 },
				],
			},
		},
		shot: { of: "524690415" },
	},
	props: {
		days: defineProp<DayNote[]>()({
			label: "Days",
			aka: ["habits"],
			hint: "A folder of habit notes, or a folder of day notes for a single habit.",
			default: [],
			writes: ["update", "create"],
			describes: {
				days: { type: "date", many: true, aka: ["entries", "dates", "log", "checkins"] },
				done: { type: "number", aka: ["kept", "value", "count", "steps", "amount", "score"] },
				date: { type: "date", aka: ["created", "day", "when", "on"] },
				title: { type: "text", aka: ["name"] },
			},
		}),
		pick: defineProp<string>()({
			label: "Which habit",
			hint: "The habit this grid writes into. Bind it to a habit list and the month follows what the list picks.",
			of: "days",
			field: "name",
			fallback: "first",
		}),
		isWeekStartingMonday: defineProp<boolean>()({
			label: "Weeks start on Monday",
			default: true,
		}),
	},
});

export default createWidget(manifest, ({ isWeekStartingMonday: fromMonday, days, pick }) => {
	const room = useRef<HTMLDivElement | null>(null);
	const box = useSize(room, { width: ACROSS * 44, height: MOST_WEEKS * 44 });
	const [shift, setShift] = useState(0);

	const listed = useData(days.list, { limit: ALL_DAYS });
	const rows = listed.data as DayNote[];
	const picked = String(pickedValue(useData(pick.get).data) ?? "");
	const isPerHabit = shapeOf(rows) === "habit";
	const habit = isPerHabit ? habitNamed(rows, picked) : undefined;
	const logged = daysLogged(rows);
	const keptDays = isPerHabit ? keptDaysOf(habit) : logged.keptDays;

	const now = new Date();
	const today = isoOf(now);
	const shown = new Date(now.getFullYear(), now.getMonth() + shift, 1);
	const isWeekStartingMonday = weekStartsMonday(useData(fromMonday.get).data);

	const ring = ringFor(box);
	const press = isPerHabit
		? pressingHabit(days, habit, keptDays)
		: pressing({ days, noteByDay: logged.noteByDay, keptDays });
	const canWrite = isPerHabit ? canDo(days.update) && habit !== undefined : canDo(days.update) && canDo(days.create);
	const month = daysInSixWeeks(shown.getFullYear(), shown.getMonth(), isWeekStartingMonday);
	const cells = cellsOver(month, keptDays, today, canWrite);

	return (
		<div className="habit-month" style={sizesFor(ring) as Record<string, string>}>
			<style>{STYLE}</style>
			<MonthHead shown={shown} caption={captionOf(isPerHabit, habit)} onShift={(by) => setShift(shift + by)} />
			<div className="hm-room" ref={room}>
				<WeekdayNames isWeekStartingMonday={isWeekStartingMonday} />
				<div className="hm-days">
					{cells.map((cell) => (
						<DayButton
							key={cell.day}
							cell={cell}
							flameSize={Math.round(ring * FLAME_SHARE)}
							onPress={() => press(cell.day)}
						/>
					))}
				</div>
			</div>
		</div>
	);
});
