export type FieldType = "text" | "number" | "date" | "list" | "boolean";

export interface FieldReport {
	prop: string;
	type: FieldType;
	elementType: FieldType;
	typesSeen: FieldType[];
	many: boolean;
	values: string[];
}

const VALUES_KEPT = 24;
const LOOKS_LIKE_A_DAY = /^\d{4}-\d\d-\d\d/;

function isRecord(held: unknown): held is Record<string, unknown> {
	return typeof held === "object" && held !== null;
}

function fieldsIn(record: unknown): Record<string, unknown> {
	if (!isRecord(record)) return {};
	const carried = record["props"];
	return isRecord(carried) ? carried : record;
}

export function isBoolean(held: unknown): boolean {
	return held === true || held === false || held === "true" || held === "false";
}

export function isNumber(held: unknown): boolean {
	return held !== "" && !isBoolean(held) && Number.isFinite(Number(held));
}

export function isDay(held: unknown): boolean {
	if (held instanceof Date) return !Number.isNaN(held.getTime());
	return typeof held === "string" && LOOKS_LIKE_A_DAY.test(held) && !Number.isNaN(Date.parse(held));
}

interface Seen {
	prop: string;
	values: Set<string>;
	holdsList: boolean;
	countsAs: Set<FieldType>;
}

function heldBySeen(seen: Seen): FieldType {
	const [only, andMore] = [...seen.countsAs];
	if (!only || andMore) return "text";
	return only;
}

function typeOfSeen(seen: Seen): FieldType {
	return seen.holdsList ? "list" : heldBySeen(seen);
}

function countAs(held: unknown): FieldType {
	if (isBoolean(held)) return "boolean";
	if (isDay(held)) return "date";
	if (isNumber(held)) return "number";
	return "text";
}

function note(seen: Seen, held: unknown) {
	if (Array.isArray(held)) {
		seen.holdsList = true;
		for (const one of held) note(seen, one);
		return;
	}
	if (held === undefined || held === null || held === "") return;
	if (isRecord(held) && !(held instanceof Date)) return;
	seen.countsAs.add(countAs(held));
	if (seen.values.size < VALUES_KEPT) seen.values.add(String(held));
}

// TRADE-OFF: read off the records rather than declared, because frontmatter carries no schema to read
export function fieldsOf(records: readonly unknown[]): FieldReport[] {
	const held = new Map<string, Seen>();
	for (const record of records) {
		for (const [prop, value] of Object.entries(fieldsIn(record))) {
			const seen = held.get(prop) ?? {
				prop,
				values: new Set<string>(),
				holdsList: false,
				countsAs: new Set<FieldType>(),
			};
			note(seen, value);
			held.set(prop, seen);
		}
	}
	return [...held.values()]
		.filter((seen) => seen.countsAs.size > 0 || seen.holdsList)
		.map((seen) => ({
			prop: seen.prop,
			type: typeOfSeen(seen),
			elementType: heldBySeen(seen),
			typesSeen: [...seen.countsAs].sort(),
			many: seen.holdsList,
			values: [...seen.values].sort(),
		}))
		.sort((left, right) => left.prop.localeCompare(right.prop));
}
