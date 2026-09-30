import { isObject } from "./is-object.js";

// TRADE-OFF: tiers, not multipliers — a weight only holds "title beats description" on average
const NAME_TIER = 3;
const KEYWORD_TIER = 2;
const BLURB_TIER = 1;

export interface SearchField {
	readonly key: string;
	readonly tier: number;
}

export type ReadSearchField<Record> = (record: Record, key: string) => unknown;

export interface SearchOptions<Record> {
	readonly fields?: readonly SearchField[];
	readonly read?: ReadSearchField<Record>;
}

export interface SearchHit<Record> {
	readonly record: Record;
	readonly order: number;
	readonly score: number;
}

export const DEFAULT_FIELDS: readonly SearchField[] = [
	{ key: "title", tier: NAME_TIER },
	{ key: "id", tier: NAME_TIER },
	{ key: "keywords", tier: KEYWORD_TIER },
	{ key: "description", tier: BLURB_TIER },
];

const MATCHED_POINTS = 16;
const CONTIGUOUS_POINTS = 12;
const WORD_START_POINTS = 24;
const EARLY_POINTS = 20;
const EARLY_FADE_PER_CHAR = 2;
const DECISIVE_RUN_AT_WORD_START_POINTS = 80;
const WHOLE_FIELD_POINTS = 40;
// TRADE-OFF: a typo costs more than the word-start run earns, so a guess never outranks a hit
const TYPO_POINTS = 90;
const QUALITY_HALF_POINTS_KEEPING_UNDER_ONE_TIER = 200;
// TRADE-OFF: three letters carry too little to spend one on a guess
const SHORTEST_TYPO_TERM = 4;
// TRADE-OFF: one guessed letter, never two — two turns every short word into every other one
const TYPO_BUDGET = 1;

const DIACRITICS = /[̀-ͯ]/g;
const NOT_A_WORD = /[^a-z0-9]+/g;

interface Run {
	readonly positions: readonly number[];
	readonly score: number;
}

interface RunWithTypos extends Run {
	readonly typos: number;
}

export function fold(text: unknown): string {
	return String(text ?? "")
		.normalize("NFD")
		.replace(DIACRITICS, "")
		.toLowerCase()
		.replace(NOT_A_WORD, " ")
		.trim();
}

export function terms(query: unknown): string[] {
	return fold(query)
		.split(" ")
		.filter((term) => term !== "");
}

export function scoreTermInText(term: string, text: string): number | null {
	if (term === "" || text === "") return null;
	const hit = bestRunAllowing(term, text, TYPO_BUDGET);
	return hit === null ? null : hit.score;
}

// TRADE-OFF: every term must land, and the record scores their mean — a query is a conjunction
export function rankSearch<Record>(
	query: unknown,
	records: readonly Record[],
	options: SearchOptions<Record> = {},
): SearchHit<Record>[] {
	const fields = options.fields ?? DEFAULT_FIELDS;
	const read = options.read ?? readOwn;
	const wanted = terms(query);
	if (wanted.length === 0) return inHandedOrder(records);

	const found: SearchHit<Record>[] = [];
	records.forEach((record, order) => {
		const score = meanScore(wanted, record, fields, read);
		if (score !== null) found.push({ record, order, score });
	});
	return found.sort(byScoreThenHandedOrder);
}

function inHandedOrder<Record>(records: readonly Record[]): SearchHit<Record>[] {
	return records.map((record, order) => ({ record, order, score: 0 }));
}

function byScoreThenHandedOrder<Record>(one: SearchHit<Record>, other: SearchHit<Record>): number {
	return other.score - one.score || one.order - other.order;
}

function meanScore<Record>(
	wanted: readonly string[],
	record: Record,
	fields: readonly SearchField[],
	read: ReadSearchField<Record>,
): number | null {
	let total = 0;
	for (const term of wanted) {
		const score = scoreTerm(term, record, fields, read);
		if (score === null) return null;
		total += score;
	}
	return total / wanted.length;
}

function textOf(value: unknown): string {
	return fold(Array.isArray(value) ? value.join(" ") : value);
}

function startsWord(text: string, index: number): boolean {
	return index === 0 || text[index - 1] === " ";
}

function scorePositions(positions: readonly number[], text: string, typos: number): number {
	const first = positions[0] ?? 0;
	let score = positions.length * MATCHED_POINTS;
	let unbroken = true;
	positions.forEach((position, at) => {
		if (at === 0) return;
		if (position === (positions[at - 1] ?? 0) + 1) score += CONTIGUOUS_POINTS;
		else unbroken = false;
	});
	for (const index of positions) {
		if (startsWord(text, index)) score += WORD_START_POINTS;
	}
	score += Math.max(0, EARLY_POINTS - EARLY_FADE_PER_CHAR * first);
	if (unbroken && startsWord(text, first)) score += DECISIVE_RUN_AT_WORD_START_POINTS;
	if (unbroken && positions.length === text.length) score += WHOLE_FIELD_POINTS;
	return Math.max(0, score - typos * TYPO_POINTS);
}

function runFrom(term: string, text: string, start: number): number[] | null {
	const found = [start];
	let at = start;
	for (let index = 1; index < term.length; index += 1) {
		const next = text.indexOf(term.charAt(index), at + 1);
		if (next === -1) return null;
		found.push(next);
		at = next;
	}
	return found;
}

function bestRun(term: string, text: string): Run | null {
	const lead = term.charAt(0);
	let best: Run | null = null;
	for (let start = text.indexOf(lead); start !== -1; start = text.indexOf(lead, start + 1)) {
		const found = runFrom(term, text, start);
		if (found === null) break;
		const score = scorePositions(found, text, 0);
		if (best === null || score > best.score) best = { positions: found, score };
	}
	return best;
}

// TRADE-OFF: one dropped letter covers a substitution and a transposition too — either becomes
// TRADE-OFF: a plain subsequence once the odd letter is gone, and two mistakes are not caught
function bestRunAllowing(term: string, text: string, budget: number): RunWithTypos | null {
	const clean = bestRun(term, text);
	if (clean !== null) return { positions: clean.positions, typos: 0, score: clean.score };
	if (budget <= 0 || term.length < SHORTEST_TYPO_TERM) return null;
	let best: RunWithTypos | null = null;
	for (let drop = 0; drop < term.length; drop += 1) {
		const shorter = `${term.slice(0, drop)}${term.slice(drop + 1)}`;
		const hit = bestRunAllowing(shorter, text, budget - 1);
		if (hit === null) continue;
		const typos = hit.typos + 1;
		const score = scorePositions(hit.positions, text, typos);
		if (best === null || score > best.score) best = { positions: hit.positions, typos, score };
	}
	return best;
}

function scoreTerm<Record>(
	term: string,
	record: Record,
	fields: readonly SearchField[],
	read: ReadSearchField<Record>,
): number | null {
	let best: number | null = null;
	for (const field of fields) {
		const raw = scoreTermInText(term, textOf(read(record, field.key)));
		if (raw === null) continue;
		const score = field.tier + raw / (raw + QUALITY_HALF_POINTS_KEEPING_UNDER_ONE_TIER);
		if (best === null || score > best) best = score;
	}
	return best;
}

function readOwn(record: unknown, key: string): unknown {
	return isObject(record) ? record[key] : undefined;
}
