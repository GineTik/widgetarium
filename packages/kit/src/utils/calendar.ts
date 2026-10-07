import { DAYS_IN_WEEK, FIXED_WEEKS } from "../constants/calendar";
import type { WeekDay } from "../constants/calendar";

export interface CalendarCell {
	readonly date: Date;
	readonly outside: boolean;
	readonly today: boolean;
	readonly selected: boolean;
	readonly disabled: boolean;
	readonly rangeStart: boolean;
	readonly rangeMiddle: boolean;
	readonly rangeEnd: boolean;
}

export interface MonthGridAsk {
	readonly year: number;
	readonly month: number;
	readonly weekStartsOn: WeekDay;
	readonly fixedWeeks: boolean;
}

export interface MonthDay {
	readonly date: Date;
	readonly outside: boolean;
}

export interface MonthBounds {
	readonly start: Date | undefined;
	readonly end: Date | undefined;
}

type HeldDate = Date | null | undefined;

const DAYS_OF_KEY: ReadonlyMap<string, number> = new Map([
	["ArrowLeft", -1],
	["ArrowRight", 1],
	["ArrowUp", -DAYS_IN_WEEK],
	["ArrowDown", DAYS_IN_WEEK],
]);

const MONTHS_OF_KEY: ReadonlyMap<string, number> = new Map([
	["PageUp", -1],
	["PageDown", 1],
]);

export function monthDays({ year, month, weekStartsOn, fixedWeeks }: MonthGridAsk): MonthDay[] {
	const first = new Date(year, month, 1);
	const lead = (first.getDay() - weekStartsOn + DAYS_IN_WEEK) % DAYS_IN_WEEK;
	const count = fixedWeeks ? FIXED_WEEKS * DAYS_IN_WEEK : weeksSpanned(lead, daysInMonth(year, month)) * DAYS_IN_WEEK;
	return Array.from({ length: count }, (_, offset) => {
		const date = new Date(year, month, 1 - lead + offset);
		return { date, outside: date.getMonth() !== month };
	});
}

export function weeksOf(days: readonly MonthDay[]): MonthDay[][] {
	return Array.from({ length: Math.ceil(days.length / DAYS_IN_WEEK) }, (_, week) =>
		days.slice(week * DAYS_IN_WEEK, (week + 1) * DAYS_IN_WEEK),
	);
}

export function weekdaysFrom(weekStartsOn: WeekDay): number[] {
	return Array.from({ length: DAYS_IN_WEEK }, (_, at) => (weekStartsOn + at) % DAYS_IN_WEEK);
}

export function sameDay(one: HeldDate, other: HeldDate): boolean {
	if (!one || !other) return false;
	return (
		one.getFullYear() === other.getFullYear() &&
		one.getMonth() === other.getMonth() &&
		one.getDate() === other.getDate()
	);
}

export function dayKey(date: Date): string {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthsAfter(month: Date, count: number): Date {
	return new Date(month.getFullYear(), month.getMonth() + count, 1);
}

export function monthIndex(date: Date): number {
	return date.getFullYear() * 12 + date.getMonth();
}

export function isMonthAllowed(month: Date, bounds: MonthBounds): boolean {
	if (bounds.start && monthIndex(month) < monthIndex(bounds.start)) return false;
	return !bounds.end || monthIndex(month) <= monthIndex(bounds.end);
}

export function moveByKey(date: Date, key: string): Date | null {
	const days = DAYS_OF_KEY.get(key);
	if (days !== undefined) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
	const months = MONTHS_OF_KEY.get(key);
	if (months !== undefined) return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
	return null;
}

function daysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

function weeksSpanned(lead: number, days: number): number {
	return Math.ceil((lead + days) / DAYS_IN_WEEK);
}
