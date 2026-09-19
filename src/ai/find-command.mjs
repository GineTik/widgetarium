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
	return entries.filter((entry) => {
		if (options.source === "installed" && !entry.installed) return false;
		if (options.source === "offered" && entry.installed) return false;
		if (typeof options.pack === "string" && entry.pack !== options.pack) return false;
		if (typeof options.tag === "string" && !namesTag(entry, options.tag)) return false;
		if (typeof options.search === "string" && !matches(entry, options.search)) return false;
		return true;
	});
}

function namesTag(entry, tag) {
	return (entry.keywords ?? []).some((word) => word.toLowerCase() === String(tag).toLowerCase());
}

function scoredEntry(entry, card, options) {
	const reasons = [];
	const readings = readingsIn(card);
	let score = needsScore(neededTypes(options.needs), typesIn(card), reasons);
	if (typeof options.role === "string") {
		const same = card?.role === options.role;
		score += same ? SCORE_ROLE : 0;
		reasons.push(same ? `role ${card.role}` : `role ${card?.role ?? "none"}, not ${options.role}`);
	}
	if (typeof options.reading === "string") {
		const same = readings.has(options.reading);
		score += same ? SCORE_READING : 0;
		reasons.push(same ? `reads as ${options.reading}` : `reads as ${[...readings].join(", ") || "nothing"}`);
	}
	const said = typeof options.about === "string" ? options.about : options.search;
	if (typeof said === "string" && matches(entry, said)) {
		score += SCORE_ABOUT;
		reasons.push(`named for ${said}`);
	}
	return {
		...entry,
		role: card?.role ?? entry.role ?? null,
		installed: Boolean(entry.installed),
		reads: [...readings],
		wraps: [...new Set([...readings].map(wrapOf))],
		score,
		why: reasons,
	};
}

function needsScore(needed, types, reasons) {
	let score = 0;
	for (const type of needed) {
		if (types.has(type)) {
			score += SCORE_NEEDS_EXACT;
			reasons.push(`holds ${type}`);
		} else if (types.has(WILDCARD_FIELD_TYPE)) {
			score += SCORE_NEEDS_COMPATIBLE;
			reasons.push(`no ${type}, but a text field can carry it`);
		} else {
			reasons.push(`no field for ${type}`);
		}
	}
	return score;
}

function typesIn(card) {
	const held = new Set();
	for (const prop of Object.values(card?.props ?? {})) {
		if (typeof prop?.type === "string") held.add(prop.type);
		for (const field of Object.values(prop?.describes ?? {})) {
			if (typeof field?.type === "string") held.add(field.type);
		}
	}
	return held;
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
