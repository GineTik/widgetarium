const DAYS_OF_KEY = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

const MONTHS_OF_KEY = { PageUp: -1, PageDown: 1 };

const CALENDAR_CELLS = 42;

export function calendarDays(shownYear, shownMonth, today, selected) {
	const first = startOfCalendar(shownYear, shownMonth);
	const days = [];
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

export function sameDay(one, other) {
	if (!one || !other) return false;
	return (
		one.getFullYear() === other.getFullYear() &&
		one.getMonth() === other.getMonth() &&
		one.getDate() === other.getDate()
	);
}

export function dayKey(date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function moveByKey(date, key) {
	if (key in DAYS_OF_KEY) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + DAYS_OF_KEY[key]);
	if (key in MONTHS_OF_KEY) return new Date(date.getFullYear(), date.getMonth() + MONTHS_OF_KEY[key], date.getDate());
	return null;
}

function startOfCalendar(year, month) {
	const first = new Date(year, month, 1);
	const lead = (first.getDay() + 6) % 7;
	return new Date(year, month, 1 - lead);
}
