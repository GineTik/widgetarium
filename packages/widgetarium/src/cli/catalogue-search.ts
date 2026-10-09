import type { CatalogueEntry } from "./catalogue-read.js";

export interface RankedEntry {
	readonly entry: CatalogueEntry;
	readonly score: number;
}

const NAME_WEIGHT = 3;
const KEYWORD_WEIGHT = 2;
const DESCRIPTION_WEIGHT = 1;
const WORD_GAP = /\s+/;

export function rankedEntries(entries: readonly CatalogueEntry[], asked: readonly string[]): RankedEntry[] {
	const words = asked.flatMap((said) => said.toLowerCase().split(WORD_GAP)).filter((word) => word !== "");
	return entries
		.map((entry) => ({ entry, score: words.reduce((sum, word) => sum + scoreOf(entry, word), 0) }))
		.filter(({ score }) => score > 0)
		.sort((left, right) => right.score - left.score || left.entry.id.localeCompare(right.entry.id));
}

function scoreOf({ id, card }: CatalogueEntry, word: string): number {
	const named = `${id} ${card.title ?? ""}`.toLowerCase().includes(word) ? NAME_WEIGHT : 0;
	const keyword = card.keywords.some((held) => held.toLowerCase() === word) ? KEYWORD_WEIGHT : 0;
	const described = card.description.toLowerCase().includes(word) ? DESCRIPTION_WEIGHT : 0;
	return named + keyword + described;
}
