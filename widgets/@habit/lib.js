const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

export function isoOf(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function dayOf(iso) {
	return Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

// TRADE-OFF: UTC, while isoOf reads a Date in local time — a date-only shift must not drift over a DST seam
export function shiftedBy(iso, days) {
	const when = new Date(Date.parse(`${iso}T00:00:00Z`));
	when.setUTCDate(when.getUTCDate() + days);
	return when.toISOString().slice(0, 10);
}

// CONTEXT: a boolean tick counts as one; a number counts as itself
function amountOf(value) {
	if (value === true) return 1;
	if (value === false || value === null || value === undefined) return 0;
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
}

// CONTEXT: the two shipped formats — a note per habit holds an array, a note per day does not
export function shapeOf(rows) {
	return (rows ?? []).some((row) => Array.isArray(row?.days)) ? "habit" : "day";
}

function fromHabits(rows, pick) {
	const log = [];
	for (const row of rows) {
		if (pick && row.name !== pick) continue;
		for (const date of row.days ?? []) {
			if (ISO.test(date)) log.push({ date, value: 1, path: row.path, name: row.name });
		}
	}
	return log;
}

function fromDays(rows) {
	const log = [];
	for (const row of rows) {
		const day = dayOfNote(row);
		if (!day) continue;
		const value = amountOf(row.done);
		if (value > 0) log.push({ date: day, value, path: row.path, name: row.name });
	}
	return log;
}

export function readLog(rows, { pick = "" } = {}) {
	const held = rows ?? [];
	const log = shapeOf(held) === "habit" ? fromHabits(held, pick) : fromDays(held);
	return log.sort((first, second) => (first.date < second.date ? -1 : first.date > second.date ? 1 : 0));
}

// CONTEXT: maxGap is how many missed days a run survives — a streak nobody can break is not one
export function streakOf(log, { maxGap = 0, today = "" } = {}) {
	const days = [...new Set((log ?? []).map((entry) => entry.date))].sort().map(dayOf);
	if (days.length === 0) return { current: 0, best: 0, last: null };

	const reach = maxGap + 1;
	let best = 1;
	let run = 1;
	for (let at = 1; at < days.length; at += 1) {
		run = days[at] - days[at - 1] <= reach ? run + 1 : 1;
		if (run > best) best = run;
	}

	const now = today ? dayOf(today) : days[days.length - 1];
	// CONTEXT: a run stays alive while today is still inside its reach, done or not
	let current = now - days[days.length - 1] <= reach ? 1 : 0;
	if (current) {
		for (let at = days.length - 1; at > 0 && days[at] - days[at - 1] <= reach; at -= 1) current += 1;
	}
	return { current, best, last: isoOf(new Date(days[days.length - 1] * DAY_MS)) };
}

export const FLAME =
	"M11.93 1.14C12.29 0.82 12.81 0.66 13.35 0.81C13.78 0.92 14.19 1.1 14.58 1.32C16.15 2.25 18.31 3.74 20.07 5.8C21.84 7.87 23.25 10.55 23.25 13.84C23.25 17.05 21.97 19.45 19.87 21.01C17.8 22.56 15 23.25 12 23.25C9 23.25 6.2 22.56 4.13 21.01C2.03 19.45 0.75 17.05 0.75 13.84C0.75 9.04 3.75 5.53 6.52 3.31C7.56 2.48 8.91 3.13 9.29 4.18C9.54 4.9 9.85 5.47 10.18 5.8C10.21 5.83 10.24 5.84 10.29 5.83C10.34 5.83 10.41 5.79 10.47 5.72C11.04 4.94 11.29 3.67 11.36 2.38C11.38 1.9 11.59 1.45 11.93 1.14ZM12.36 11.67C12.13 11.55 11.87 11.55 11.64 11.67C10.65 12.15 8 13.69 8 16.3C8 18.51 9.79 19.5 12 19.5C14.21 19.5 16 18.51 16 16.3C16 13.69 13.35 12.15 12.36 11.67Z";

const A_DAY_IN_TEXT = /\d{4}-\d{2}-\d{2}/;

function writtenDay(held) {
	return A_DAY_IN_TEXT.exec(String(held ?? ""))?.[0] ?? null;
}

function dayOfNote(note) {
	return writtenDay(note.date) ?? writtenDay(note.name);
}

export function daysLogged(notes) {
	const noteByDay = new Map();
	const keptDays = new Set();
	for (const note of notes ?? []) {
		const day = dayOfNote(note);
		if (!day) continue;
		noteByDay.set(day, note);
		if (note.done != null) keptDays.add(day);
	}
	return { noteByDay, keptDays };
}

// TRADE-OFF: a new note is seeded with the need's own name, because nothing has resolved it yet in a folder with no such property
export function pressing({ days, noteByDay, keptDays }) {
	return async (day) => {
		const found = noteByDay.get(day);
		if (found) return days.update({ ref: found.ref, data: { done: keptDays.has(day) ? null : 1 } });
		return days.create({ name: day, props: { done: 1 } });
	};
}
