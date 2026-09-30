import { isObject } from "@widgetarium/core/engine/is-object.js";
import { readingOfProp, wrapOf, READINGS } from "@widgetarium/core/reading.js";
import type { Reading } from "@widgetarium/core/reading.js";
import { cardIn, matches, pageRows } from "./entries.js";
import type { PageAsk } from "./entries.js";
import type { WidgetEntry } from "./widget-entry.js";

export interface FindOptions extends PageAsk {
	readonly source?: unknown;
	readonly pack?: unknown;
	readonly tag?: unknown;
	readonly search?: unknown;
	readonly needs?: unknown;
	readonly role?: unknown;
	readonly reading?: unknown;
	readonly about?: unknown;
}

export interface RankedWidget extends WidgetEntry {
	readonly reads: Reading[];
	readonly wraps: string[];
	readonly score: number;
	readonly why: string[];
}

export interface RankAnswer {
	readonly value: {
		readonly total: number;
		readonly offset: number;
		readonly limit: number;
		readonly widgets: RankedWidget[];
	};
	readonly text: string;
}

interface Score {
	readonly score: number;
	readonly reason: string;
}

type Card = Readonly<Record<string, unknown>>;

const SCORE_NEEDS_EXACT = 40;
const SCORE_NEEDS_COMPATIBLE = 15;
const SCORE_ROLE = 30;
const SCORE_READING = 25;
const SCORE_ABOUT = 20;
const WILDCARD_FIELD_TYPE = "text";

export const READING_KINDS = READINGS.join(" | ");

export async function rankWidgets(asked: readonly WidgetEntry[], options: FindOptions): Promise<RankAnswer> {
	const entries = narrowEntries(asked, options);
	const rows: RankedWidget[] = [];
	for (const entry of entries) rows.push(scoreEntry(entry, cardOf(await cardIn(entry.folder)), options));
	rows.sort((one, other) => other.score - one.score || one.id.localeCompare(other.id));
	const { offset, limit, page } = pageRows(rows, options);
	const text = [
		`${rows.length} widgets ranked, showing ${page.length} from ${offset}`,
		...page.map(
			(row) =>
				`${String(row.score).padStart(4)}  ${row.installed ? "have" : "GET "}  ${row.id.padEnd(30)} ${row.why.join(" · ")}`,
		),
	].join("\n");
	return { value: { total: rows.length, offset, limit, widgets: page }, text };
}

export function refuseReading(asked: unknown): string | null {
	if (typeof asked !== "string" || isReading(asked)) return null;
	return `${asked} is not a reading; the five are ${READING_KINDS}.`;
}

function isReading(asked: string): asked is Reading {
	return READINGS.some((reading) => reading === asked);
}

function cardOf(read: unknown): Card | null {
	return isObject(read) ? read : null;
}

function narrowEntries(entries: readonly WidgetEntry[], options: FindOptions): WidgetEntry[] {
	const { pack, tag, search } = options;
	const asked = [
		options.source === "installed" && ((entry: WidgetEntry) => entry.installed),
		options.source === "offered" && ((entry: WidgetEntry) => !entry.installed),
		typeof pack === "string" && ((entry: WidgetEntry) => entry.pack === pack),
		typeof tag === "string" && ((entry: WidgetEntry) => namesTag(entry, tag)),
		typeof search === "string" && ((entry: WidgetEntry) => matches(entry, search)),
	].filter((keep): keep is (entry: WidgetEntry) => boolean => typeof keep === "function");
	return entries.filter((entry) => asked.every((keep) => keep(entry)));
}

function namesTag(entry: WidgetEntry, tag: string): boolean {
	return (entry.keywords ?? []).some((word) => word.toLowerCase() === String(tag).toLowerCase());
}

function scoreEntry(entry: WidgetEntry, card: Card | null, options: FindOptions): RankedWidget {
	const readings = readingsIn(card);
	const types = typesIn(card);
	const scored = [
		...parseNeededTypes(options.needs).map((type) => needScore(type, types)),
		roleScore(card, options.role),
		readingScore(readings, options.reading),
		aboutScore(entry, options),
	].filter((one): one is Score => one !== null);
	const role = card?.["role"];
	return {
		...entry,
		role: typeof role === "string" ? role : entry.role,
		installed: Boolean(entry.installed),
		reads: [...readings],
		wraps: [...new Set([...readings].map(wrapOf))],
		score: scored.reduce((sum, one) => sum + one.score, 0),
		why: scored.map((one) => one.reason),
	};
}

function roleScore(card: Card | null, asked: unknown): Score | null {
	if (typeof asked !== "string") return null;
	const role = card?.["role"];
	if (role === asked) return { score: SCORE_ROLE, reason: `role ${role}` };
	return { score: 0, reason: `role ${String(role ?? "none")}, not ${asked}` };
}

function readingScore(readings: ReadonlySet<Reading>, asked: unknown): Score | null {
	if (typeof asked !== "string") return null;
	if (isReading(asked) && readings.has(asked)) return { score: SCORE_READING, reason: `reads as ${asked}` };
	return { score: 0, reason: `reads as ${[...readings].join(", ") || "nothing"}` };
}

function aboutScore(entry: WidgetEntry, options: FindOptions): Score | null {
	const said = typeof options.about === "string" ? options.about : options.search;
	if (typeof said !== "string" || !matches(entry, said)) return null;
	return { score: SCORE_ABOUT, reason: `named for ${said}` };
}

function needScore(type: string, types: ReadonlySet<string>): Score {
	if (types.has(type)) return { score: SCORE_NEEDS_EXACT, reason: `holds ${type}` };
	if (types.has(WILDCARD_FIELD_TYPE))
		return { score: SCORE_NEEDS_COMPATIBLE, reason: `no ${type}, but a text field can carry it` };
	return { score: 0, reason: `no field for ${type}` };
}

function propsOf(card: Card | null): unknown[] {
	const props = card?.["props"];
	return isObject(props) ? Object.values(props) : [];
}

function typesIn(card: Card | null): Set<string> {
	const stated = propsOf(card).flatMap((prop) => {
		const describes = isObject(prop) ? prop["describes"] : undefined;
		return [prop, ...(isObject(describes) ? Object.values(describes) : [])];
	});
	return new Set(
		stated.map((one) => (isObject(one) ? one["type"] : undefined)).filter((type) => typeof type === "string"),
	);
}

function readingsIn(card: Card | null): Set<Reading> {
	return new Set(propsOf(card).map((prop) => readingOfProp(isObject(prop) ? prop : null)));
}

function parseNeededTypes(value: unknown): string[] {
	return String(value ?? "")
		.split(",")
		.map((word) => word.trim().toLowerCase())
		.filter(Boolean);
}
