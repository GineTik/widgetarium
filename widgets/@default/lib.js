const NEUTRAL_PERCENT = 0.5;
const A_DAY_IN_TEXT = /\d{4}-\d{2}-\d{2}/;
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;
const AMOUNT_IS_NOT_A_NUMBER = "That amount is not a number.";
const THE_RECORD_DID_NOT_LAND = "That record could not be written. The folder may already hold it.";

export function summarize(records, days, today, rising) {
	const span = Math.max(1, Math.round(days) || 1);
	const { entries, left } = readEntries(records, today);

	const now = windowEnding(today, span);
	const before = windowEnding(shiftedBy(now.first, -1), span);
	const points = summedByDay(entries, now, span);
	const behind = points.filter((point) => point.isLogged).map((point) => point.value);

	const total = points.reduce((held, point) => held + point.value, 0);
	const was = summedOver(entries, before);
	const change = total - was;
	const percent = was === 0 ? null : (change / Math.abs(was)) * 100;

	return {
		points,
		total,
		today: summedOver(entries, windowEnding(today, 1)),
		change,
		percent,
		tone: toneOf(change, percent, rising),
		peak: behind.length > 0 ? Math.max(...behind) : null,
		low: behind.length > 0 ? Math.min(...behind) : null,
		avg: total / span,
		...spanOf(points),
		...left,
	};
}

export async function writeDraft(records, draft) {
	const amount = Number(draft.amount);
	if (draft.amount.trim() === "" || !Number.isFinite(amount)) return AMOUNT_IS_NOT_A_NUMBER;

	const written = { date: draft.date, amount, note: draft.note };
	const name = `${draft.date} ${keyOf(written)}`;
	// TODO: drop the second shape once a create maps an unresolved need to its own name
	const shapes = [{ name, ...written }, { name, props: written }];

	let refusal = null;
	for (const shape of shapes) {
		try {
			await records.create(shape);
			return "";
		} catch (refused) {
			refusal = refused;
		}
	}

	console.error("Widgetarium: a metric record could not be written", refusal);
	return THE_RECORD_DID_NOT_LAND;
}

export function platesOf(summary) {
	return [
		{ label: "today", value: formatSigned(summary.today), isTone: true, isWide: false },
		{ label: "peak", value: compactOrDash(summary.peak), isTone: false, isWide: false },
		{ label: "low", value: compactOrDash(summary.low), isTone: false, isWide: true },
		{ label: "avg", value: formatCompact(Math.round(summary.avg)), isTone: false, isWide: true },
	];
}

export function leftOutLine(summary) {
	const said = [
		summary.undated > 0 ? `${summary.undated} carry no date` : "",
		summary.unreadable > 0 ? `${summary.unreadable} carry no readable amount` : "",
		summary.ahead > 0 ? `${summary.ahead} are dated ahead of today` : "",
	].filter(Boolean);

	return said.length === 0 ? "" : `Left out of every number: ${said.join(", ")}.`;
}

export function spotsOf(points, span, box) {
	return points.map((point, at) => ({ x: acrossX(at, points.length, box.width), y: downY(point.value, span, box) }));
}

export function barsOf(points, span, box) {
	const slot = box.width / points.length;
	const width = slot * box.barShare;
	const base = downY(0, span, box);

	return points.map((point, at) => {
		const reach = downY(point.value, span, box);
		return {
			day: point.day,
			x: at * slot + (slot - width) / 2,
			y: Math.min(reach, base),
			width,
			height: Math.abs(reach - base) + box.bleed,
			rx: width / 2,
		};
	});
}

export function baselineOf(span, box) {
	return downY(0, span, box);
}

// TRADE-OFF: monotone rather than a prettier spline — basis and catmull-rom overshoot below the baseline, and the fill under the line shows it
export function pathThrough(spots) {
	if (spots.length === 0) return "";
	if (spots.length === 1) return `M${rounded(spots[0].x)} ${rounded(spots[0].y)}`;

	const tangents = tangentsOver(spots);
	let path = `M${rounded(spots[0].x)} ${rounded(spots[0].y)}`;
	for (let at = 0; at < spots.length - 1; at += 1) {
		const reach = (spots[at + 1].x - spots[at].x) / 3;
		path += ` C${rounded(spots[at].x + reach)} ${rounded(spots[at].y + tangents[at] * reach)}`;
		path += ` ${rounded(spots[at + 1].x - reach)} ${rounded(spots[at + 1].y - tangents[at + 1] * reach)}`;
		path += ` ${rounded(spots[at + 1].x)} ${rounded(spots[at + 1].y)}`;
	}
	return path;
}

export function areaUnder(spots, base) {
	if (spots.length === 0) return "";
	const first = spots[0];
	const last = spots[spots.length - 1];
	return `${pathThrough(spots)} L${rounded(last.x)} ${rounded(base)} L${rounded(first.x)} ${rounded(base)} Z`;
}

export function keyOf(draft) {
	const seed = `${draft.date}|${draft.amount}|${draft.note ?? ""}`;
	let hash = FNV_OFFSET;
	for (let at = 0; at < seed.length; at += 1) {
		hash ^= seed.charCodeAt(at);
		hash = Math.imul(hash, FNV_PRIME);
	}
	return (hash >>> 0).toString(36).padStart(7, "0");
}

export function isoOf(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// TRADE-OFF: UTC, while isoOf reads a Date in local time — a date-only shift must not drift over a DST seam
export function shiftedBy(iso, days) {
	const when = new Date(Date.parse(`${iso}T00:00:00Z`));
	when.setUTCDate(when.getUTCDate() + days);
	return when.toISOString().slice(0, 10);
}

export function emptyDraft(today) {
	return { date: today, amount: "", note: "" };
}

export function dateOf(iso) {
	return new Date(Date.parse(`${iso}T00:00:00`));
}

export function dayOfRecord(record) {
	const written = A_DAY_IN_TEXT.exec(String(record?.date ?? ""));
	if (written) return written[0];
	const named = A_DAY_IN_TEXT.exec(String(record?.name ?? ""));
	return named ? named[0] : null;
}

export function readableDay(iso) {
	const when = new Date(Date.parse(`${iso}T00:00:00Z`));
	return when.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatCompact(value) {
	const size = Math.abs(value);
	if (size >= 1e9) return `${trimmedDecimals(value / 1e9)}B`;
	if (size >= 1e6) return `${trimmedDecimals(value / 1e6)}M`;
	if (size >= 1e3) return `${trimmedDecimals(value / 1e3)}K`;
	return String(Math.round(value));
}

export function formatPercent(percent) {
	const size = Math.abs(percent);
	return size > 999 ? ">999%" : `${size.toFixed(1)}%`;
}

export function formatSigned(value) {
	return `${value < 0 ? "−" : "+"}${formatCompact(Math.abs(value))}`;
}

export function tipShare(hovered, count) {
	return (hovered + 0.5) / count;
}

export function amountOf(record) {
	const held = Number(record?.amount);
	return Number.isFinite(held) ? held : null;
}

function compactOrDash(value) {
	return value === null ? "—" : formatCompact(value);
}

function readEntries(records, today) {
	const entries = [];
	const left = { undated: 0, unreadable: 0, ahead: 0 };

	for (const record of records ?? []) {
		const amount = amountOf(record);
		const day = dayOfRecord(record);
		if (amount === null) left.unreadable += 1;
		else if (!day) left.undated += 1;
		else if (day > today) left.ahead += 1;
		else entries.push({ day, amount, ref: record.ref, note: record.note ?? "" });
	}

	return { entries, left };
}

function windowEnding(last, days) {
	return { first: shiftedBy(last, 1 - days), last };
}

function isWithin(day, window) {
	return day >= window.first && day <= window.last;
}

function summedOver(entries, window) {
	return entries.reduce((held, entry) => (isWithin(entry.day, window) ? held + entry.amount : held), 0);
}

function summedByDay(entries, window, days) {
	const logged = new Map();
	for (const entry of entries) {
		if (!isWithin(entry.day, window)) continue;
		logged.set(entry.day, (logged.get(entry.day) ?? 0) + entry.amount);
	}

	const points = [];
	for (let at = 0; at < days; at += 1) {
		const day = shiftedBy(window.first, at);
		points.push({ day, value: logged.get(day) ?? 0, isLogged: logged.has(day) });
	}
	return points;
}

// TRADE-OFF: a flat series is widened by one, because a zero span divides the scale by nothing
function spanOf(points) {
	const values = points.map((point) => point.value);
	const floor = Math.min(0, ...values);
	const ceiling = Math.max(0, ...values);
	return ceiling > floor ? { floor, ceiling } : { floor, ceiling: floor + 1 };
}

function toneOf(change, percent, rising) {
	if (rising === "neither") return "flat";
	if (percent !== null && Math.abs(percent) < NEUTRAL_PERCENT) return "flat";
	return change >= 0 === (rising !== "bad") ? "up" : "down";
}

function acrossX(at, count, width) {
	return count <= 1 ? width / 2 : (width * at) / (count - 1);
}

function downY(value, span, box) {
	return box.height - ((value - span.floor) / (span.ceiling - span.floor)) * (box.height - box.headRoom);
}

function tangentsOver(spots) {
	const secants = [];
	for (let at = 0; at < spots.length - 1; at += 1) {
		const run = spots[at + 1].x - spots[at].x;
		secants.push(run === 0 ? 0 : (spots[at + 1].y - spots[at].y) / run);
	}

	const held = [secants[0]];
	for (let at = 1; at < secants.length; at += 1) {
		const before = secants[at - 1];
		const after = secants[at];
		if (before * after <= 0) {
			held.push(0);
			continue;
		}
		const runBefore = spots[at].x - spots[at - 1].x;
		const runAfter = spots[at + 1].x - spots[at].x;
		const weight = 2 * runAfter + runBefore;
		const other = runAfter + 2 * runBefore;
		held.push((weight + other) / (weight / before + other / after));
	}
	held.push(secants[secants.length - 1]);
	return held;
}

function trimmedDecimals(value) {
	return value.toFixed(2).replace(/\.?0+$/, "");
}

function rounded(value) {
	return Math.round(value * 10) / 10;
}
