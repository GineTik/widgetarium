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

// CONTEXT: a boolean tick counts as one; a number counts as itself
function amountOf(value) {
	if (value === true) return 1;
	if (value === false || value === null || value === undefined) return 0;
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
}

// CONTEXT: the two shipped formats — a note per habit holds an array, a note per day does not
export function shapeOf(rows, field) {
	return (rows ?? []).some((row) => Array.isArray(row?.props?.[field])) ? "habit" : "day";
}

function fromHabits(rows, field, pick) {
	const log = [];
	for (const row of rows) {
		if (pick && row.name !== pick) continue;
		for (const date of row.props?.[field] ?? []) {
			if (ISO.test(date)) log.push({ date, value: 1, path: row.path, name: row.name });
		}
	}
	return log;
}

function fromDays(rows, field) {
	const log = [];
	for (const row of rows) {
		if (!ISO.test(row.name ?? "")) continue;
		const value = amountOf(row.props?.[field]);
		if (value > 0) log.push({ date: row.name, value, path: row.path, name: row.name });
	}
	return log;
}

export function readLog(rows, { field = "entries", pick = "" } = {}) {
	const held = rows ?? [];
	const log = shapeOf(held, field) === "habit" ? fromHabits(held, field, pick) : fromDays(held, field);
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

function labelOf(iso, span) {
	if (span === "month") return iso.slice(0, 7);
	if (span !== "week") return iso;
	const monday = new Date(Date.parse(`${iso}T00:00:00Z`));
	monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
	return monday.toISOString().slice(0, 10);
}

export function bucketOf(log, span = "day") {
	const totals = new Map();
	for (const entry of log ?? []) {
		const label = labelOf(entry.date, span);
		totals.set(label, (totals.get(label) ?? 0) + entry.value);
	}
	return [...totals.entries()].sort().map(([label, value]) => ({ label, value }));
}

// CONTEXT: a pie needs categories, not an axis — so it counts rows, never a dated log
export function groupOf(rows, prop) {
	const totals = new Map();
	for (const row of rows ?? []) {
		for (const held of [].concat(row?.props?.[prop] ?? [])) {
			const label = String(held ?? "").trim();
			if (label) totals.set(label, (totals.get(label) ?? 0) + 1);
		}
	}
	return [...totals.entries()].sort((first, second) => second[1] - first[1]).map(([label, value]) => ({ label, value }));
}
