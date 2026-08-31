// CONTEXT: no DOM and no widget here — records are plain objects, the caller names the fields

// TRADE-OFF: tiers, not multipliers — a weight only holds "title beats description" on average
const NAME_TIER = 3;
const KEYWORD_TIER = 2;
const BLURB_TIER = 1;

export const DEFAULT_FIELDS = [
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
// CONTEXT: the decisive bonus — a whole run on a word start is what a typed word means
const RUN_AT_WORD_START_POINTS = 80;
const WHOLE_FIELD_POINTS = 40;
// TRADE-OFF: a typo costs more than the word-start run earns, so a guess never outranks a hit
const TYPO_POINTS = 90;
// CONTEXT: quality = raw / (raw + this), squashed into [0, 1) so it cannot cross a tier
const QUALITY_HALF_POINTS = 200;
// TRADE-OFF: three letters carry too little to spend one on a guess
const SHORTEST_TYPO_TERM = 4;
// TRADE-OFF: one guessed letter, never two — two turns every short word into every other one
const TYPO_BUDGET = 1;

const DIACRITICS = /[\u0300-\u036f]/g;
const NOT_A_WORD = /[^a-z0-9]+/g;

export function fold(text) {
	return String(text ?? "")
		.normalize("NFD")
		.replace(DIACRITICS, "")
		.toLowerCase()
		.replace(NOT_A_WORD, " ")
		.trim();
}

export function terms(query) {
	return fold(query).split(" ").filter((term) => term !== "");
}

function textOf(value) {
	return fold(Array.isArray(value) ? value.join(" ") : value);
}

function startsWord(text, index) {
	return index === 0 || text[index - 1] === " ";
}

function scorePositions(positions, text, typos) {
	let score = positions.length * MATCHED_POINTS;
	let unbroken = true;
	for (let at = 1; at < positions.length; at += 1) {
		if (positions[at] === positions[at - 1] + 1) score += CONTIGUOUS_POINTS;
		else unbroken = false;
	}
	for (const index of positions) {
		if (startsWord(text, index)) score += WORD_START_POINTS;
	}
	score += Math.max(0, EARLY_POINTS - EARLY_FADE_PER_CHAR * positions[0]);
	if (unbroken && startsWord(text, positions[0])) score += RUN_AT_WORD_START_POINTS;
	if (unbroken && positions.length === text.length) score += WHOLE_FIELD_POINTS;
	return Math.max(0, score - typos * TYPO_POINTS);
}

// CONTEXT: fzf's forward pass — every anchor tried, earliest next letter taken
function bestRun(term, text) {
	let best = null;
	let bestScore = -1;
	for (let start = text.indexOf(term[0]); start !== -1; start = text.indexOf(term[0], start + 1)) {
		const found = [start];
		let at = start;
		let broke = false;
		for (let index = 1; index < term.length; index += 1) {
			const next = text.indexOf(term[index], at + 1);
			if (next === -1) {
				broke = true;
				break;
			}
			found.push(next);
			at = next;
		}
		// CONTEXT: a later anchor starts further right, so what ran out here runs out there too
		if (broke) break;
		const score = scorePositions(found, text, 0);
		if (score > bestScore) {
			bestScore = score;
			best = found;
		}
	}
	return best === null ? null : { positions: best, score: bestScore };
}

// TRADE-OFF: one dropped letter covers a substitution and a transposition too — either becomes
// TRADE-OFF: a plain subsequence once the odd letter is gone, and two mistakes are not caught
function bestRunAllowing(term, text, budget) {
	const clean = bestRun(term, text);
	if (clean !== null) return { positions: clean.positions, typos: 0, score: clean.score };
	if (budget <= 0 || term.length < SHORTEST_TYPO_TERM) return null;
	let best = null;
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

export function scoreTermInText(term, text) {
	if (term === "" || text === "") return null;
	const hit = bestRunAllowing(term, text, TYPO_BUDGET);
	return hit === null ? null : hit.score;
}

function scoreTerm(term, record, fields, read) {
	let best = null;
	for (const field of fields) {
		const raw = scoreTermInText(term, textOf(read(record, field.key)));
		if (raw === null) continue;
		const score = field.tier + raw / (raw + QUALITY_HALF_POINTS);
		if (best === null || score > best) best = score;
	}
	return best;
}

function readOwn(record, key) {
	return record?.[key];
}

// TRADE-OFF: every term must land, and the record scores their mean — a query is a conjunction
export function rankSearch(query, records, options = {}) {
	const fields = options.fields ?? DEFAULT_FIELDS;
	const read = options.read ?? readOwn;
	const wanted = terms(query);
	// CONTEXT: an empty query is not a search — the order the caller handed in IS the answer
	if (wanted.length === 0) return records.map((record, order) => ({ record, order, score: 0 }));

	const found = [];
	records.forEach((record, order) => {
		let total = 0;
		for (const term of wanted) {
			const score = scoreTerm(term, record, fields, read);
			if (score === null) return;
			total += score;
		}
		found.push({ record, order, score: total / wanted.length });
	});
	// CONTEXT: the handed-in order breaks a tie, so an equal score never shuffles between renders
	return found.sort((one, other) => other.score - one.score || one.order - other.order);
}
