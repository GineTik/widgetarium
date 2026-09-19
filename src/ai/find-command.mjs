import { readingOfProp, wrapOf, READINGS } from "../reading.js";
import { cardIn, matches, pagedOf } from "./entries.mjs";

const SCORE_NEEDS_EXACT = 40;
const SCORE_NEEDS_COMPATIBLE = 15;
const SCORE_ROLE = 30;
const SCORE_READING = 25;
const SCORE_ABOUT = 20;
const WILDCARD_FIELD_TYPE = "text";

export const READING_KINDS = READINGS.join(" | ");

export async function rankedWidgets(asked, options) {
	const entries = narrowed(asked, options);
	const rows = [];
	for (const entry of entries) rows.push(scoredEntry(entry, await cardIn(entry.folder), options));
	rows.sort((one, other) => other.score - one.score || one.id.localeCompare(other.id));
	const { offset, limit, page } = pagedOf(rows, options);
	const text = [
		`${rows.length} widgets ranked, showing ${page.length} from ${offset}`,
		...page.map(
			(row) =>
				`${String(row.score).padStart(4)}  ${row.installed ? "have" : "GET "}  ${row.id.padEnd(30)} ${row.why.join(" · ")}`,
		),
	].join("\n");
	return { value: { total: rows.length, offset, limit, widgets: page }, text };
}

export function refusedReading(asked) {
	if (typeof asked !== "string" || READINGS.includes(asked)) return null;
	return `${asked} is not a reading; the five are ${READING_KINDS}.`;
}

function narrowed(entries, options) {
	const asked = [
		options.source === "installed" && ((entry) => entry.installed),
		options.source === "offered" && ((entry) => !entry.installed),
		typeof options.pack === "string" && ((entry) => entry.pack === options.pack),
		typeof options.tag === "string" && ((entry) => namesTag(entry, options.tag)),
		typeof options.search === "string" && ((entry) => matches(entry, options.search)),
	].filter(Boolean);
	return entries.filter((entry) => asked.every((keep) => keep(entry)));
}

function namesTag(entry, tag) {
	return (entry.keywords ?? []).some((word) => word.toLowerCase() === String(tag).toLowerCase());
}

function scoredEntry(entry, card, options) {
	const readings = readingsIn(card);
	const types = typesIn(card);
	const scored = [
		...neededTypes(options.needs).map((type) => needScore(type, types)),
		roleScore(card, options.role),
		readingScore(readings, options.reading),
		aboutScore(entry, options),
	].filter(Boolean);
	return {
		...entry,
		role: card?.role ?? entry.role ?? null,
		installed: Boolean(entry.installed),
		reads: [...readings],
		wraps: [...new Set([...readings].map(wrapOf))],
		score: scored.reduce((sum, one) => sum + one.score, 0),
		why: scored.map((one) => one.reason),
	};
}

function roleScore(card, asked) {
	if (typeof asked !== "string") return null;
	if (card?.role === asked) return { score: SCORE_ROLE, reason: `role ${card.role}` };
	return { score: 0, reason: `role ${card?.role ?? "none"}, not ${asked}` };
}

function readingScore(readings, asked) {
	if (typeof asked !== "string") return null;
	if (readings.has(asked)) return { score: SCORE_READING, reason: `reads as ${asked}` };
	return { score: 0, reason: `reads as ${[...readings].join(", ") || "nothing"}` };
}

function aboutScore(entry, options) {
	const said = typeof options.about === "string" ? options.about : options.search;
	if (typeof said !== "string" || !matches(entry, said)) return null;
	return { score: SCORE_ABOUT, reason: `named for ${said}` };
}

function needScore(type, types) {
	if (types.has(type)) return { score: SCORE_NEEDS_EXACT, reason: `holds ${type}` };
	if (types.has(WILDCARD_FIELD_TYPE))
		return { score: SCORE_NEEDS_COMPATIBLE, reason: `no ${type}, but a text field can carry it` };
	return { score: 0, reason: `no field for ${type}` };
}

function typesIn(card) {
	const stated = Object.values(card?.props ?? {}).flatMap((prop) => [prop, ...Object.values(prop?.describes ?? {})]);
	return new Set(stated.map((one) => one?.type).filter((type) => typeof type === "string"));
}

function readingsIn(card) {
	return new Set(Object.values(card?.props ?? {}).map((prop) => readingOfProp(prop)));
}

function neededTypes(value) {
	return String(value ?? "")
		.split(",")
		.map((word) => word.trim().toLowerCase())
		.filter(Boolean);
}
