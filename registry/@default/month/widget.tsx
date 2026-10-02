import {
	ICommand,
	IQuery,
	RecordRefSchema,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	pickedValue,
	useData,
	z,
} from "widgetarium";
import type { PropsOf, RecordRef, Row } from "widgetarium";
import { useRef, useState } from "react";
import { daysLogged, isoOf, leadDaysOf, pressing, shapeOf } from "@default/lib";
import { DayButton } from "./day-button";
import { MonthHead } from "./month-head";
import { ACROSS, RUN_OVERHANG_PX } from "./grid-measures";
import { STYLE } from "./style";
import type { DayCell, MonthDay, Size } from "./types";
import { useSize } from "./use-size";
import { WeekdayNames } from "./weekday-names";

const ALL_DAYS = 2000;

const MOST_WEEKS = 6;

const DAY_NUMBER_SHARE = 0.56;
const NUMBER_GAP_SHARE = 0.12;
const SEAT_SHARE = 1.16;
const ROW_GAP_SHARE = 0.36;
const WEEKDAY_ROW_SHARE = 0.52;
const WEEKDAY_GAP_SHARE = 0.5;

const COLUMN_FILL = 0.8;
const FLAME_SHARE = 0.6;
const SMALLEST_RING_PX = 9;
const LARGEST_RING_PX = 46;

const A_DAY = /^\d{4}-\d{2}-\d{2}$/;
const NOTHING_TRACKED = "No habit here yet";

const DayNoteSchema = VaultRecordSchema.extend({
	path: z.string(),
	name: z.string(),
	days: z
		.array(z.string())
		.nullable()
		.optional()
		.meta({ aka: ["entries", "dates", "log", "checkins"] }),
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
	title: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["name"] }),
});

type DayNote = z.infer<typeof DayNoteSchema>;

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

type MonthProps = PropsOf<typeof HabitMonth>;

function keptDaysOf(habit?: DayNote) {
	const held = Array.isArray(habit?.days) ? habit.days : [];
	const listed = held.map((entry) => String(entry ?? "").slice(0, 10));
	return new Set(listed.filter((entry) => A_DAY.test(entry)));
}

function pressingHabit(updateDay: MonthProps["updateDay"], habit: Row<DayNote> | undefined, kept: Set<string>) {
	return async (day: string) => {
		if (!habit) return undefined;
		const held = new Set(kept);
		if (held.has(day)) held.delete(day);
		else held.add(day);
		return updateDay({ ref: habit.ref, days: [...held].sort() });
	};
}

function dayWriterOf(updateDay: MonthProps["updateDay"], createDay: MonthProps["createDay"]) {
	return {
		update: ({ ref, data }: { ref: RecordRef; data: { done: number | null } }) => updateDay({ ref, ...data }),
		create: (draft: { name: string; props: { done: number } }) => createDay({ id: crypto.randomUUID(), ...draft }),
	};
}

function habitNamed(rows: Row<DayNote>[], picked: string) {
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

const HabitMonth = createWidget({
	inject: {
		getDays: IQuery.expects(z.array(DayNoteSchema)),
		updateDay: ICommand.sends(DayNoteSchema.partial().extend({ ref: RecordRefSchema })),
		createDay: ICommand.sends(DayNoteSchema.partial({ path: true }).extend({ id: z.uuid() })),
		getPick: IQuery.expects(z.unknown()),
		getIsWeekStartingMonday: IQuery.expects(z.boolean().default(true)),
	},
	draw: ({ getIsWeekStartingMonday: fromMonday, getDays, updateDay, createDay, getPick: pick }) => {
		const room = useRef<HTMLDivElement | null>(null);
		const box = useSize(room, { width: ACROSS * 44, height: MOST_WEEKS * 44 });
		const [shift, setShift] = useState(0);

		const listed = useData(getDays, { limit: ALL_DAYS });
		const rows = listed.data;
		const picked = String(pickedValue(pick) ?? "");
		const isPerHabit = shapeOf(rows) === "habit";
		const habit = isPerHabit ? habitNamed(rows, picked) : undefined;
		const logged = daysLogged(rows);
		const keptDays = isPerHabit ? keptDaysOf(habit) : logged.keptDays;

		const now = new Date();
		const today = isoOf(now);
		const shown = new Date(now.getFullYear(), now.getMonth() + shift, 1);
		const isWeekStartingMonday = weekStartsMonday(fromMonday);

		const ring = ringFor(box);
		const press = isPerHabit
			? pressingHabit(updateDay, habit, keptDays)
			: pressing({ days: dayWriterOf(updateDay, createDay), noteByDay: logged.noteByDay, keptDays });
		const canUpdate = updateDay.can().can;
		const canWrite = isPerHabit ? canUpdate && habit !== undefined : canUpdate && createDay.can().can;
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
	},
});

export const metadata = defineMetadata(HabitMonth, {
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
	preview: {
		size: { w: 6, h: 6 },
		props: {
			getDays: {
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
		getDays: {
			label: "Days",
			aka: ["days", "habits"],
			hint: "A folder of habit notes, or a folder of day notes for a single habit.",
			describes: {
				days: { type: "date", many: true },
				done: { type: "number" },
				date: { type: "date" },
				title: { type: "text" },
			},
		},
		updateDay: {
			label: "Mark a day",
			source: { implementation: "@core/rows-update", fields: { target: "getDays" } },
		},
		createDay: {
			label: "Add a day",
			source: { implementation: "@core/rows-create", fields: { target: "getDays" } },
		},
		getPick: {
			aka: ["pick"],
			label: "Which habit",
			hint: "The habit this grid writes into. Bind it to a habit list and the month follows what the list picks.",
			source: {
				implementation: "@core/selection",
				fields: { rows: "getDays", field: "name", whenNothingPicked: "first" },
			},
		},
		getIsWeekStartingMonday: {
			aka: ["isWeekStartingMonday"],
			label: "Weeks start on Monday",
		},
	},
});

export const layout = defineLayout({
	role: "indicator",
	size: {
		preferredWidth: 420,
		preferredHeight: 420,
		keepsRatio: true,
		at: [{ belowPx: 520, preferredWidth: "full" }],
		collapseBelowPx: 220,
		stackBelowPx: 280,
	},
});

export default HabitMonth;
