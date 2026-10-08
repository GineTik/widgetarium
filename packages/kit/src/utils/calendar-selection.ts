import { dayValueOf, sameDay } from "./calendar";
import { isInRange } from "./calendar-matchers";
import type { DateRange } from "./calendar-matchers";

export type CalendarMode = "single" | "multiple" | "range";

export type CalendarSelection = Date | readonly Date[] | DateRange | undefined;

export interface PickAsk {
	readonly mode: CalendarMode;
	readonly held: CalendarSelection;
	readonly day: Date;
	readonly required: boolean;
}

export interface DayMarks {
	readonly selected: boolean;
	readonly rangeStart: boolean;
	readonly rangeMiddle: boolean;
	readonly rangeEnd: boolean;
}

const UNMARKED: DayMarks = { selected: false, rangeStart: false, rangeMiddle: false, rangeEnd: false };

export function withDayPicked({ mode, held, day, required }: PickAsk): CalendarSelection {
	if (mode === "multiple") return toggleDay(datesIn(held), day, required);
	if (mode === "range") return extendRange(rangeIn(held), day);
	return sameDay(firstSelected(held), day) && !required ? undefined : day;
}

export function marksOf(date: Date, mode: CalendarMode, held: CalendarSelection): DayMarks {
	if (mode === "range") return rangeMarksOf(date, rangeIn(held));
	const selected = datesIn(held).some((one) => sameDay(one, date));
	return { ...UNMARKED, selected };
}

export function datesIn(selection: CalendarSelection): readonly Date[] {
	if (selection instanceof Date) return [selection];
	return isDateList(selection) ? selection : [];
}

export function rangeIn(selection: CalendarSelection): DateRange | undefined {
	if (selection === undefined || selection instanceof Date || isDateList(selection)) return undefined;
	return selection;
}

export function firstSelected(selection: CalendarSelection): Date | undefined {
	return rangeIn(selection)?.from ?? datesIn(selection)[0];
}

function toggleDay(days: readonly Date[], day: Date, required: boolean): readonly Date[] | undefined {
	const isHeld = days.some((one) => sameDay(one, day));
	if (!isHeld) return [...days, day];
	if (required && days.length === 1) return days;
	const left = days.filter((one) => !sameDay(one, day));
	return left.length === 0 ? undefined : left;
}

function extendRange(range: DateRange | undefined, day: Date): DateRange {
	const from = range?.from;
	if (!from || range?.to) return { from: day, to: undefined };
	if (dayValueOf(day) < dayValueOf(from)) return { from: day, to: from };
	return { from, to: day };
}

function rangeMarksOf(date: Date, range: DateRange | undefined): DayMarks {
	if (!range?.from || !isInRange(date, range)) return UNMARKED;
	const rangeStart = sameDay(date, range.from);
	const rangeEnd = sameDay(date, range.to ?? range.from);
	return { selected: true, rangeStart, rangeEnd, rangeMiddle: !rangeStart && !rangeEnd };
}

function isDateList(selection: CalendarSelection): selection is readonly Date[] {
	return Array.isArray(selection);
}
