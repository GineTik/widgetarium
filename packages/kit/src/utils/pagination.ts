export type PaginationEntry = { kind: "page"; page: number } | { kind: "gap"; key: "start" | "end" };

const PAGES_BESIDE_THE_CURRENT = 1;
const PAGES_AT_EACH_END = 1;

export function paginationItems(page: number, count: number, siblings = PAGES_BESIDE_THE_CURRENT): PaginationEntry[] {
	const edge = 2 * siblings + 2 + PAGES_AT_EACH_END;
	if (count <= edge + PAGES_AT_EACH_END + 1) return pagesFrom(1, count);
	const head = pagesFrom(1, PAGES_AT_EACH_END);
	const tail = pagesFrom(count - PAGES_AT_EACH_END + 1, count);
	if (page - siblings <= PAGES_AT_EACH_END + 2) return [...pagesFrom(1, edge), gapAt("end"), ...tail];
	if (page + siblings >= count - PAGES_AT_EACH_END - 1)
		return [...head, gapAt("start"), ...pagesFrom(count - edge + 1, count)];
	return [...head, gapAt("start"), ...pagesFrom(page - siblings, page + siblings), gapAt("end"), ...tail];
}

function pagesFrom(first: number, last: number): PaginationEntry[] {
	return Array.from({ length: Math.max(last - first + 1, 0) }, (_, at) => ({ kind: "page", page: first + at }));
}

function gapAt(key: "start" | "end"): PaginationEntry {
	return { kind: "gap", key };
}
