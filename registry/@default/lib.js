import { fieldOf, textOf } from "widgetarium";
import { TONE_NAMES } from "widgetarium/kit";

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
		tone: metricToneOf(change, percent, rising),
		peak: behind.length > 0 ? Math.max(...behind) : null,
		low: behind.length > 0 ? Math.min(...behind) : null,
		avg: total / span,
		...spanOf(points),
		...left,
	};
}

export async function writeDraft(records, draft) {
	const typed = Number(draft.amount);
	if (draft.amount.trim() === "" || !Number.isFinite(typed)) return AMOUNT_IS_NOT_A_NUMBER;

	const amount = draft.sign === "subtract" ? -Math.abs(typed) : Math.abs(typed);
	const written = { date: draft.date, amount, note: draft.note };
	const name = `${draft.date} ${keyOf(written)}`;
	// TODO: drop the second shape once a create maps an unresolved need to its own name
	const shapes = [
		{ name, ...written },
		{ name, props: written },
	];

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
	return { date: today, sign: "add", amount: "", note: "" };
}

export function dateOf(iso) {
	return new Date(Date.parse(`${iso}T00:00:00`));
}

function writtenDay(held) {
	return A_DAY_IN_TEXT.exec(String(held ?? ""))?.[0] ?? null;
}

export function dayOfRecord(record) {
	return writtenDay(record?.date) ?? writtenDay(record?.name);
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

function metricToneOf(change, percent, rising) {
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

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

export function leadDaysOf(firstWeekday, isWeekStartingMonday) {
	return isWeekStartingMonday ? (firstWeekday + 6) % 7 : firstWeekday;
}

export function dayOf(iso) {
	return Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

// TRADE-OFF: UTC, while isoOf reads a Date in local time — a date-only shift must not drift over a DST seam
function tickCountOf(value) {
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
		const day = dayOfRecord(row);
		if (!day) continue;
		const value = tickCountOf(row.done);
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

export function daysLogged(notes) {
	const noteByDay = new Map();
	const keptDays = new Set();
	for (const note of notes ?? []) {
		const day = dayOfRecord(note);
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

const NEUTRAL = "neutral";
const COLOURED_TONES = TONE_NAMES.filter((tone) => tone !== NEUTRAL);

export const DEFAULT_TIERS = [
	{ label: "S", tone: "error", order: 1 },
	{ label: "A", tone: "warning", order: 2 },
	{ label: "B", tone: "standout", order: 3 },
	{ label: "C", tone: "success", order: 4 },
	{ label: "D", tone: "info", order: 5 },
];

const CARD_SIZE_FLOOR = 32;
const CARD_SIZE_CEILING = 160;
const CARD_SIZE_DEFAULT = 64;

export const EMOJI_PREFIX = "emoji:";
export const ICON_PREFIX = "icon:";
const WEB_ADDRESS = /^https?:\/\//i;
const ALREADY_AN_EMBED = /^!\[/;

export function labelOf(tier) {
	return (textOf(tier, "label") || textOf(tier, "name")).trim();
}

export function toneOf(tier) {
	const written = textOf(tier, "tone").trim().toLowerCase();
	return TONE_NAMES.includes(written) ? written : NEUTRAL;
}

export function nameOf(card) {
	return (textOf(card, "name") || textOf(card, "title")).trim();
}

function tierOf(card) {
	return textOf(card, "tier").trim();
}

function orderOf(card) {
	const held = Number(fieldOf(card, "order"));
	return Number.isFinite(held) ? held : Number.POSITIVE_INFINITY;
}

function byOrder(one, other) {
	const first = orderOf(one);
	const second = orderOf(other);
	if (first === second) return 0;
	return first < second ? -1 : 1;
}

function byOrderThenName(one, other) {
	return byOrder(one, other) || nameOf(one).localeCompare(nameOf(other));
}

function firstOfEachLabel(rows) {
	const seen = new Set();
	const kept = [];
	for (const row of rows ?? []) {
		const label = labelOf(row);
		if (!label || seen.has(label)) continue;
		seen.add(label);
		kept.push(row);
	}
	return kept.sort(byOrder);
}

export function rackOf(tierRows, cardRows) {
	const standing = firstOfEachLabel(tierRows);
	const labels = new Set(standing.map(labelOf));
	const held = [...(cardRows ?? [])].sort(byOrderThenName);
	const rack = standing.map((row) => ({
		row,
		label: labelOf(row),
		tone: toneOf(row),
		cards: held.filter((card) => tierOf(card) === labelOf(row)),
	}));
	return {
		tiers: standing,
		rack,
		tray: held.filter((card) => !tierOf(card)),
		orphans: held.filter((card) => tierOf(card) && !labels.has(tierOf(card))),
		ranked: rack.reduce((sum, line) => sum + line.cards.length, 0),
	};
}

export function placedAt(cards, moved, at) {
	const without = cards.filter((card) => card.ref !== moved.ref);
	const landing = Math.max(0, Math.min(without.length, at));
	return [...without.slice(0, landing), moved, ...without.slice(landing)];
}

function finiteOrder(row) {
	const held = row ? orderOf(row) : Number.POSITIVE_INFINITY;
	return Number.isFinite(held) ? held : null;
}

export function orderBetween(above, below) {
	const low = finiteOrder(above);
	const high = finiteOrder(below);
	if (low === null) return high === null ? 1 : high - 1;
	if (high === null) return low + 1;
	const middle = (low + high) / 2;
	return middle > low && middle < high ? middle : null;
}

export function renumbered(cards) {
	return cards.map((card, at) => ({ ...card, order: at + 1 }));
}

function lettersOf(name) {
	const words = String(name ?? "")
		.split(/[\s_-]+/)
		.filter(Boolean);
	if (words.length === 0) return "?";
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[1][0]).toUpperCase();
}

export function pictureOf(card) {
	const letters = lettersOf(nameOf(card));
	const written = textOf(card, "picture").trim();
	if (!written) return { kind: "letters", letters };
	if (written.startsWith(EMOJI_PREFIX)) return { kind: "emoji", name: written.slice(EMOJI_PREFIX.length), letters };
	if (WEB_ADDRESS.test(written)) return { kind: "remote", src: written, letters };
	return { kind: "vault", markdown: ALREADY_AN_EMBED.test(written) ? written : `![[${written}]]`, letters };
}

// TODO: move the seed-to-tone hash into the kit — @default/kanban-board and @default/filter-panel each carry their own copy
export function toneForSeed(seed) {
	const written = String(seed ?? "");
	let sum = 0;
	for (let at = 0; at < written.length; at += 1) sum = (sum * 31 + written.charCodeAt(at)) % 100003;
	return COLOURED_TONES[sum % COLOURED_TONES.length];
}

export function nextToneAfter(tone) {
	const at = COLOURED_TONES.indexOf(tone);
	return COLOURED_TONES[(at + 1) % COLOURED_TONES.length];
}

export function cardSizeOf(value) {
	const held = Number(value);
	if (!Number.isFinite(held)) return CARD_SIZE_DEFAULT;
	return Math.max(CARD_SIZE_FLOOR, Math.min(CARD_SIZE_CEILING, Math.round(held)));
}

export function rowsOf(values) {
	return (values ?? []).map((value, at) => ({ ref: `seed${at}`, value }));
}

const A_NEW_ROW = "New row";
const A_NEW_ROW_NTH = "New row {nth}";

export function isLabelTaken(taken, label) {
	return (taken ?? []).includes(label);
}

// TODO: put freeUntitled on the widget-facing surface — src/editable-tabs.js and the kanban already carry a copy each
export function freeLabel(taken) {
	if (!isLabelTaken(taken, A_NEW_ROW)) return A_NEW_ROW;
	for (let nth = 2; nth < (taken?.length ?? 0) + 3; nth += 1) {
		const wanted = A_NEW_ROW_NTH.replace("{nth}", String(nth));
		if (!isLabelTaken(taken, wanted)) return wanted;
	}
	return A_NEW_ROW;
}

const avatarFor = (seed) => `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;

const named = (names) => names.map((name) => ({ name }));

const withFaces = (names) => names.map((name) => ({ name, picture: avatarFor(name) }));

const asEmoji = (pairs) => pairs.map(([name, face]) => ({ name, picture: `${EMOJI_PREFIX}${face}` }));

export const PRESETS = [
	{
		id: "comfort-food",
		name: "Comfort food",
		cards: named([
			"Pizza",
			"Ramen",
			"Dumplings",
			"Fried chicken",
			"Tacos",
			"Sushi",
			"Burger",
			"Pancakes",
			"Curry",
			"Pho",
			"Falafel",
			"Lasagne",
			"Pierogi",
			"Ice cream",
		]),
	},
	{
		id: "languages",
		name: "Programming languages",
		cards: named([
			"TypeScript",
			"Python",
			"Rust",
			"Go",
			"C",
			"C++",
			"Java",
			"Ruby",
			"Swift",
			"Kotlin",
			"Elixir",
			"Haskell",
			"PHP",
			"Lua",
		]),
	},
	{
		id: "saturday",
		name: "Ways to spend a Saturday",
		cards: named([
			"Long walk",
			"Cooking",
			"Reading",
			"Gaming",
			"A museum",
			"The gym",
			"Sleeping in",
			"Board games",
			"Cinema",
			"Gardening",
			"Coding",
			"Nothing at all",
		]),
	},
	{
		id: "coffee-and-tea",
		name: "Coffee and tea",
		cards: named([
			"Espresso",
			"Flat white",
			"Cold brew",
			"Filter",
			"Latte",
			"Cappuccino",
			"Matcha",
			"Earl Grey",
			"Oolong",
			"Chai",
			"Mint tea",
			"Instant",
		]),
	},
	{
		id: "music-genres",
		name: "Music genres",
		cards: named([
			"Jazz",
			"Hip hop",
			"Techno",
			"Rock",
			"Classical",
			"Ambient",
			"Metal",
			"Folk",
			"Pop",
			"Funk",
			"Drum and bass",
			"Reggae",
			"Country",
			"Opera",
		]),
	},
	{
		id: "places-to-live",
		name: "Places to live",
		cards: named([
			"Lisbon",
			"Tokyo",
			"Berlin",
			"Kyiv",
			"Seoul",
			"Amsterdam",
			"Barcelona",
			"Vienna",
			"Toronto",
			"Prague",
			"Lviv",
			"Copenhagen",
			"Melbourne",
			"Warsaw",
		]),
	},
	{
		id: "weather",
		name: "Weather",
		cards: named([
			"Spring rain",
			"Summer heat",
			"First snow",
			"Autumn wind",
			"Thunderstorm",
			"Fog",
			"Clear frost",
			"Heatwave",
			"Drizzle",
			"Blizzard",
		]),
	},
	{
		id: "note-taking",
		name: "Note-taking habits",
		cards: named([
			"Daily note",
			"Zettelkasten",
			"Bullet journal",
			"Inbox zero",
			"Tag everything",
			"Folder trees",
			"Voice memos",
			"Sticky notes",
			"Kanban",
			"Weekly review",
			"Highlighting",
			"Nothing at all",
		]),
	},
	{
		id: "the-team",
		name: "The team",
		needsTheWeb: true,
		credit: "Faces drawn by DiceBear from the Notionists set, dedicated to the public domain under CC0 1.0.",
		cards: withFaces(["Iris", "Milo", "Zoe", "Luna", "Otto", "Juno", "Finn", "Rhea", "Theo", "Ada", "Kai", "Nova"]),
	},
	{
		id: "moods",
		name: "Moods",
		cards: asEmoji([
			["Blessed", "smiling-face-with-halo"],
			["Delighted", "grinning-face"],
			["Thinking", "thinking-face"],
			["In stitches", "face-with-tears-of-joy"],
			["Sleepy", "sleepy-face"],
			["Overwhelmed", "exploding-head"],
			["Untouchable", "smiling-face-with-sunglasses"],
			["Pleading", "pleading-face"],
			["Unamused", "unamused-face"],
			["Terrified", "face-screaming-in-fear"],
			["Indifferent", "neutral-face"],
			["Celebrating", "partying-face"],
		]),
	},
];

function toTabList(value) {
	if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function namedRows(held) {
	if (typeof held === "string") return toTabList(held).map((name) => ({ name }));
	if (!Array.isArray(held)) return [];
	return held
		.map((entry) => (typeof entry === "string" ? { name: entry } : entry))
		.map((row) => ({ ...row, name: String(row?.name ?? "").trim() }))
		.filter((row) => row.name !== "");
}

export function columnsOf(board) {
	const rows = namedRows(fieldOf(board, "columns"));
	const archivedLongAgo = new Set(toTabList(fieldOf(board, "archivedColumns")));
	const named = new Set(rows.map((row) => row.name));
	const forgotten = [...archivedLongAgo].filter((name) => !named.has(name)).map((name) => ({ name }));
	return [...rows, ...forgotten].map((row) => ({
		name: row.name,
		archivedAt: row.archivedAt ?? null,
		isArchived: Boolean(row.archivedAt) || archivedLongAgo.has(row.name),
	}));
}

export const shownColumnsOf = (columns) => columns.filter((column) => !column.isArchived).map((column) => column.name);

export const archivedColumnsOf = (columns) =>
	columns.filter((column) => column.isArchived).map((column) => column.name);

const archivedStamp = (column) => column.archivedAt ?? new Date().toISOString();

export const archived = (column) => ({ ...column, isArchived: true, archivedAt: archivedStamp(column) });

export const restored = (column) => ({ ...column, isArchived: false, archivedAt: null });

export const columnPatched = (columns, name, step) =>
	columns.map((column) => (column.name === name ? step(column) : column));

// TRADE-OFF: the old key is emptied, not dropped — processFrontMatter merges and cannot delete
export function columnsWritten(columns) {
	return {
		columns: columns.map((column) =>
			column.isArchived ? { name: column.name, archivedAt: archivedStamp(column) } : { name: column.name },
		),
		archivedColumns: [],
	};
}

export function propertiesOf(board) {
	return toTabList(fieldOf(board, "properties"));
}

export const COUNTED_CEILING = 500;
const COUNTED_FIRST = "the first {counted} of {total} counted";

export function countedFirstLine(total) {
	if (typeof total !== "number" || total <= COUNTED_CEILING) return null;
	return COUNTED_FIRST.replace("{counted}", String(COUNTED_CEILING)).replace("{total}", String(total));
}

export function askedCount(data, fallback) {
	const asked = Math.round(Number(data));
	return Number.isFinite(asked) && asked > 0 ? asked : fallback;
}

const NEVER_A_PROPERTY = ["ref", "path", "name", "props", "widgetarium"];

export function heldValues(record) {
	return { ...(record ?? {}), ...(record?.props ?? {}) };
}

export function heldProperties(record) {
	return Object.fromEntries(Object.entries(heldValues(record)).filter(([key]) => !NEVER_A_PROPERTY.includes(key)));
}
