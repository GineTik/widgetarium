import { canDo, createWidget, flatRows, useData, WidgetRoot } from "widgetarium";
import type { Aka, CollectionGateway, CreateAction, Day, ListAction, UpdateAction, VaultRecord } from "widgetarium";
import { useEffect, useRef, useState } from "react";
import { Icon, IconButton } from "widgetarium/kit";
import { daysLogged, FLAME, isoOf, pressing } from "@habit/lib";

const ACROSS = 7;
const MOST_WEEKS = 6;

const DAY_NUMBER_SHARE = 0.56;
const NUMBER_GAP_SHARE = 0.08;
const SEAT_SHARE = 1.16;
const ROW_GAP_SHARE = 0.16;
const WEEKDAY_ROW_SHARE = 0.52;
const COLUMN_FILL = 0.8;
const FLAME_SHARE = 0.6;
const SMALLEST_RING_PX = 9;
const LARGEST_RING_PX = 46;

const STYLE = `
.habit-month {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-1, 4px);
	padding: var(--size-4-2, 8px);
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
	display: grid;
	grid-template-columns: repeat(${ACROSS}, minmax(0, 1fr));
	grid-template-rows: auto;
	grid-auto-rows: minmax(0, 1fr);
}

.hm-weekday {
	display: grid;
	place-items: center;
	height: var(--hm-weekday);
	padding-bottom: calc(var(--hm-gap) / 2);
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
	padding: 0;
	border: 0;
	border-radius: 0;
	background: none;
	box-shadow: none;
	cursor: pointer;
	color: var(--text-normal);
}

.habit-month .hm-day[disabled] {
	cursor: default;
}

.hm-number {
	height: var(--hm-number);
	font-size: calc(var(--hm-number) * 0.74);
	line-height: var(--hm-number);
	font-weight: var(--font-medium, 500);
	font-variant-numeric: tabular-nums;
}

.hm-day.is-outside {
	opacity: 0.42;
}

.hm-seat {
	width: 100%;
	height: var(--hm-seat);
	display: grid;
	place-items: center;
}

.hm-seat.is-run {
	background: var(--wg-kit-accent-wash);
}

.hm-seat.is-run-start {
	border-start-start-radius: 999px;
	border-end-start-radius: 999px;
}

.hm-seat.is-run-end {
	border-start-end-radius: 999px;
	border-end-end-radius: 999px;
}

.hm-ring {
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
	border-color: var(--text-normal);
}

.hm-flame {
	fill: currentColor;
}
`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const FROM_MONDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FROM_SUNDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const A_KEPT_DAY = "{date}, kept";
const AN_OPEN_DAY = "{date}, not kept";

function filled(sentence: string, values: Record<string, string>) {
	return Object.entries(values).reduce((held, [name, value]) => held.replace(`{${name}}`, value), sentence);
}

type DayNote = VaultRecord & {
	done?: (number & Aka<"kept" | "value" | "count" | "steps" | "amount" | "score">) | null;
	date?: (Day & Aka<"created" | "day" | "when" | "on">) | null;
};

type Accesses = {
	list: ListAction;
	update?: UpdateAction;
	create?: CreateAction;
};

type Size = { width: number; height: number };

type MonthDay = {
	day: string;
	dayOfMonth: number;
	isOutside: boolean;
};

type DayCell = MonthDay & {
	kept: boolean;
	seat: string;
	ring: string;
	canPress: boolean;
};

function daysInWholeWeeks(year: number, month: number, isWeekStartingMonday: boolean) {
	const firstWeekday = new Date(year, month, 1).getDay();
	const lead = isWeekStartingMonday ? (firstWeekday + 6) % 7 : firstWeekday;
	const length = new Date(year, month + 1, 0).getDate();
	const span = Math.ceil((lead + length) / ACROSS) * ACROSS;
	const days: MonthDay[] = [];
	for (let at = 0; at < span; at += 1) {
		const when = new Date(year, month, at - lead + 1);
		days.push({ day: isoOf(when), dayOfMonth: when.getDate(), isOutside: when.getMonth() !== month });
	}
	return days;
}

// TRADE-OFF: sized for the six weeks a month can need, never the five it often has — a ring resized by paging reads as breakage
function ringFor({ width, height }: Size) {
	const perWeek = DAY_NUMBER_SHARE + NUMBER_GAP_SHARE + SEAT_SHARE + ROW_GAP_SHARE;
	const tallest = height / (WEEKDAY_ROW_SHARE + ROW_GAP_SHARE / 2 + MOST_WEEKS * perWeek);
	const widest = (width / ACROSS) * COLUMN_FILL;
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
	};
}

function seatClass(kept: boolean[], at: number) {
	if (!kept[at]) return "hm-seat";
	const opens = at % ACROSS !== 0 && kept[at - 1] ? "" : " is-run-start";
	const closes = at % ACROSS !== ACROSS - 1 && kept[at + 1] ? "" : " is-run-end";
	return `hm-seat is-run${opens}${closes}`;
}

function ringClass(day: string, kept: boolean, today: string) {
	if (kept) return "hm-ring is-kept";
	return day === today ? "hm-ring is-today" : "hm-ring";
}

function cellsOver(days: MonthDay[], keptDays: Set<string>, today: string, canPress: boolean): DayCell[] {
	const kept = days.map((each) => keptDays.has(each.day));
	return days.map((each, at) => ({
		...each,
		kept: kept[at],
		seat: seatClass(kept, at),
		ring: ringClass(each.day, kept[at], today),
		canPress,
	}));
}

function useSize(node: { current: HTMLElement | null }, fallback: Size) {
	const [box, setBox] = useState(fallback);
	useEffect(() => {
		const held = node.current;
		if (!held || typeof ResizeObserver !== "function") return undefined;
		const watcher = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
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
			className={`hm-day${cell.isOutside ? " is-outside" : ""}`}
			disabled={!cell.canPress}
			aria-pressed={cell.kept}
			aria-label={filled(cell.kept ? A_KEPT_DAY : AN_OPEN_DAY, { date: cell.day })}
			onClick={onPress}
		>
			<span className="hm-number">{cell.dayOfMonth}</span>
			<span className={cell.seat}>
				<span className={cell.ring}>{cell.kept ? <Flame size={flameSize} /> : null}</span>
			</span>
		</button>
	);
}

export default createWidget(function HabitMonth({ settings, days }: { settings: Record<string, unknown>; days: CollectionGateway<DayNote, Accesses> }) {
	const room = useRef<HTMLDivElement | null>(null);
	const box = useSize(room, { width: ACROSS * 44, height: MOST_WEEKS * 44 });
	const [shift, setShift] = useState(0);

	const listed = useData(days.list);
	const { noteByDay, keptDays } = daysLogged(flatRows(listed.rows));

	const now = new Date();
	const today = isoOf(now);
	const shown = new Date(now.getFullYear(), now.getMonth() + shift, 1);
	const isWeekStartingMonday = typeof settings.isWeekStartingMonday === "boolean" ? settings.isWeekStartingMonday : true;

	const ring = ringFor(box);
	const flameSize = Math.round(ring * FLAME_SHARE);
	const press = pressing({ days, noteByDay, keptDays });
	const month = daysInWholeWeeks(shown.getFullYear(), shown.getMonth(), isWeekStartingMonday);
	const cells = cellsOver(month, keptDays, today, canDo(days.update) && canDo(days.create));

	return (
		<WidgetRoot background="var(--wg-kit-fill)" className="habit-month" style={sizesFor(ring)}>
			<style>{STYLE}</style>
			<div className="hm-head">
				<IconButton size="s" label="Previous month" onClick={() => setShift(shift - 1)}>
					<Icon name="chevron" size={15} className="hm-flip" />
				</IconButton>
				<span className="hm-title">{`${MONTHS[shown.getMonth()]} ${shown.getFullYear()}`}</span>
				<IconButton size="s" label="Next month" onClick={() => setShift(shift + 1)}>
					<Icon name="chevron" size={15} />
				</IconButton>
			</div>
			<div className="hm-room" ref={room}>
				{(isWeekStartingMonday ? FROM_MONDAY : FROM_SUNDAY).map((name) => (
					<span className="hm-weekday" key={name}>
						{name}
					</span>
				))}
				{cells.map((cell) => (
					<DayButton key={cell.day} cell={cell} flameSize={flameSize} onPress={() => press(cell.day)} />
				))}
			</div>
		</WidgetRoot>
	);
});
