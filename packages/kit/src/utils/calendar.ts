export interface CalendarCell {
	readonly date: Date;
	readonly outside: boolean;
	readonly today: boolean;
	readonly selected: boolean;
}

type HeldDate = Date | null | undefined;

const DAYS_OF_KEY: ReadonlyMap<string, number> = new Map([
	["ArrowLeft", -1],
	["ArrowRight", 1],
	["ArrowUp", -7],
	["ArrowDown", 7],
]);

const MONTHS_OF_KEY: ReadonlyMap<string, number> = new Map([
	["PageUp", -1],
	["PageDown", 1],
]);

const CALENDAR_CELLS = 42;

export function calendarDays(
	shownYear: number,
	shownMonth: number,
	today: HeldDate,
	selected: HeldDate,
): CalendarCell[] {
	const first = startOfCalendar(shownYear, shownMonth);
	const days: CalendarCell[] = [];
	for (let offset = 0; offset < CALENDAR_CELLS; offset += 1) {
		const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
		days.push({
			date,
			outside: date.getMonth() !== shownMonth,
			today: sameDay(date, today),
			selected: sameDay(date, selected),
		});
	}
	return days;
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

export function moveByKey(date: Date, key: string): Date | null {
	const days = DAYS_OF_KEY.get(key);
	if (days !== undefined) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
	const months = MONTHS_OF_KEY.get(key);
	if (months !== undefined) return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
	return null;
}

function startOfCalendar(year: number, month: number): Date {
	const first = new Date(year, month, 1);
	const lead = (first.getDay() + 6) % 7;
	return new Date(year, month, 1 - lead);
}
