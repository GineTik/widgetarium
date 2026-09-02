import { canDo, createWidget, flatRows, useData, WidgetRoot } from "widgetarium";
import type { CollectionGateway, CreateAction, ListAction, Ref, UpdateAction, VaultRecord } from "widgetarium";
import { useEffect, useRef, useState } from "react";
import { isoOf, shiftedBy, streakOf } from "@habit/lib";

const COLUMN_PX = 44;
const RING_PX = 36;
const CONNECTOR_PX = 12;
const CARD_PAD_Y_PX = 10;

const STYLE = `
.habit-streak {
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: ${CARD_PAD_Y_PX}px 0;
	overflow: hidden;
}

.hs-room {
	width: 100%;
	display: flex;
	justify-content: center;
}

.hs-card {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.hs-rail {
	display: flex;
	align-items: stretch;
}

.hs-edge {
	flex: none;
	width: ${CONNECTOR_PX}px;
	align-self: end;
	height: ${RING_PX + 4}px;
	background: transparent;
}

.hs-edge.is-run {
	background: var(--wg-kit-accent-wash);
}

.hs-day {
	flex: none;
	width: ${COLUMN_PX}px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	padding: 0;
	border: 0;
	background: transparent;
	cursor: pointer;
	color: var(--text-normal);
}

.hs-day[disabled] {
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

.hs-day:hover .hs-name,
.hs-date {
	display: none;
}

.hs-day:hover .hs-date {
	display: block;
}

.hs-seat {
	width: 100%;
	height: ${RING_PX + 4}px;
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

.hs-foot {
	display: flex;
	align-items: center;
	gap: 6px;
	height: 18px;
	padding-inline-start: ${CONNECTOR_PX}px;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--text-normal);
}

.hs-foot .hs-flame {
	color: var(--interactive-accent);
	flex: none;
}

.hs-foot.is-cold,
.hs-foot.is-cold .hs-flame {
	color: var(--text-faint);
}
`;


const FLAME =
	"M11.93 1.14C12.29 0.82 12.81 0.66 13.35 0.81C13.78 0.92 14.19 1.1 14.58 1.32C16.15 2.25 18.31 3.74 20.07 5.8C21.84 7.87 23.25 10.55 23.25 13.84C23.25 17.05 21.97 19.45 19.87 21.01C17.8 22.56 15 23.25 12 23.25C9 23.25 6.2 22.56 4.13 21.01C2.03 19.45 0.75 17.05 0.75 13.84C0.75 9.04 3.75 5.53 6.52 3.31C7.56 2.48 8.91 3.13 9.29 4.18C9.54 4.9 9.85 5.47 10.18 5.8C10.21 5.83 10.24 5.84 10.29 5.83C10.34 5.83 10.41 5.79 10.47 5.72C11.04 4.94 11.29 3.67 11.36 2.38C11.38 1.9 11.59 1.45 11.93 1.14ZM12.36 11.67C12.13 11.55 11.87 11.55 11.64 11.67C10.65 12.15 8 13.69 8 16.3C8 18.51 9.79 19.5 12 19.5C14.21 19.5 16 18.51 16 16.3C16 13.69 13.35 12.15 12.36 11.67Z";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const ONE_DAY = "{count} day";
const MANY_DAYS = "{count} days";
const A_KEPT_DAY = "{date}, kept";
const AN_OPEN_DAY = "{date}, not kept";

function filled(sentence: string, values: Record<string, string>) {
	return Object.entries(values).reduce((held, [name, value]) => held.replace(`{${name}}`, value), sentence);
}

const A_DAY_IN_TEXT = /\d{4}-\d{2}-\d{2}/;

type DayNote = VaultRecord & { props?: Record<string, unknown> };

type LoggedDay = DayNote & { ref: Ref };

type Accesses = {
	list: ListAction;
	update?: UpdateAction;
	create?: CreateAction;
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

function writtenDay(held: unknown) {
	if (held instanceof Date) return held.toISOString().slice(0, 10);
	return A_DAY_IN_TEXT.exec(String(held ?? ""))?.[0] ?? null;
}

function dayOfNote(note: DayNote, dateAnchorProp: string) {
	const anchored = dateAnchorProp ? writtenDay(note.props?.[dateAnchorProp]) : null;
	return anchored ?? writtenDay(note.name);
}

function isKept(note: DayNote, keptProp: string) {
	const held = note.props?.[keptProp];
	return held !== undefined && held !== null && held !== "" && held !== false;
}

function daysLogged(notes: LoggedDay[], dateAnchorProp: string, keptProp: string) {
	const noteByDay = new Map<string, LoggedDay>();
	const keptDays = new Set<string>();
	for (const note of notes) {
		const day = dayOfNote(note, dateAnchorProp);
		if (!day) continue;
		noteByDay.set(day, note);
		if (isKept(note, keptProp)) keptDays.add(day);
	}
	return { noteByDay, keptDays };
}

function columnsAcross(roomWidth: number) {
	return Math.max(1, Math.floor((roomWidth - 2 * CONNECTOR_PX) / COLUMN_PX));
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

function edgeClass(keptDays: Set<string>, day: string, towards: number) {
	return keptDays.has(day) && keptDays.has(shiftedBy(day, towards)) ? "hs-edge is-run" : "hs-edge";
}

function dayColumns(shown: string[], keptDays: Set<string>, today: string, canPress: boolean): DayColumn[] {
	return shown.map((day) => {
		const kept = keptDays.has(day);
		return { day, kept, seat: seatClass(keptDays, day), ring: ringClass(day, kept, today), canPress };
	});
}

type PressSetup = {
	days: CollectionGateway<DayNote, Accesses>;
	noteByDay: Map<string, LoggedDay>;
	keptDays: Set<string>;
	keptProp: string;
	dateAnchorProp: string;
};

function pressing({ days, noteByDay, keptDays, keptProp, dateAnchorProp }: PressSetup) {
	return async (day: string) => {
		const found = noteByDay.get(day);
		if (found) return days.update({ ref: found.ref, data: { props: { [keptProp]: keptDays.has(day) ? null : 1 } } });
		return days.create({ name: day, props: { [keptProp]: 1, ...(dateAnchorProp ? { [dateAnchorProp]: day } : {}) } });
	};
}

function useWidth(node: { current: HTMLElement | null }, fallback: number) {
	const [width, setWidth] = useState(fallback);
	useEffect(() => {
		const held = node.current;
		if (!held || typeof ResizeObserver !== "function") return undefined;
		const watcher = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
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

function Foot({ count }: { count: number }) {
	return (
		<div className={`hs-foot${count === 0 ? " is-cold" : ""}`}>
			<Flame size={18} />
			<span>{filled(count === 1 ? ONE_DAY : MANY_DAYS, { count: String(count) })}</span>
		</div>
	);
}

export default createWidget(function HabitStreak({
	settings,
	days,
}: {
	settings: any;
	days: CollectionGateway<DayNote, Accesses>;
}) {
	const room = useRef<HTMLDivElement | null>(null);
	const roomWidth = useWidth(room, 7 * COLUMN_PX + 2 * CONNECTOR_PX);
	const today = isoOf(new Date());

	const dateAnchorProp = String(settings.dateAnchorProp ?? "").trim();
	const keptProp = String(settings.keptProp ?? "").trim() || "done";
	const listed = useData(days.list);
	const { noteByDay, keptDays } = daysLogged(flatRows(listed.rows), dateAnchorProp, keptProp);

	const shown = daysAround(today, columnsAcross(roomWidth));
	const streak = streakOf([...keptDays].map((date) => ({ date })), { today });
	const press = pressing({ days, noteByDay, keptDays, keptProp, dateAnchorProp });
	const columns = dayColumns(shown, keptDays, today, canDo(days.update) && canDo(days.create));

	return (
		<WidgetRoot background="var(--wg-kit-fill)" className="habit-streak">
			<style>{STYLE}</style>
			<div className="hs-room" ref={room}>
				<div className="hs-card" style={{ width: shown.length * COLUMN_PX + 2 * CONNECTOR_PX }}>
					<div className="hs-rail">
						<i className={edgeClass(keptDays, shown[0], -1)} />
						{columns.map((column) => (
							<DayButton key={column.day} column={column} onPress={() => press(column.day)} />
						))}
						<i className={edgeClass(keptDays, shown[shown.length - 1], 1)} />
					</div>
					<Foot count={streak.current} />
				</div>
			</div>
		</WidgetRoot>
	);
});
