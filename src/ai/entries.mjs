import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { RECORD_FILES } from "../engine/catalogue-index.js";
import { rankSearch } from "../engine/search.js";

const LARGEST_PAGE = 100;
const DEFAULT_PAGE = 20;

export function matches(entry, asked) {
	return rankSearch(asked, [entry]).length > 0;
}

export async function cardIn(folder) {
	if (typeof folder !== "string" || folder === "") return null;
	for (const name of RECORD_FILES) {
		const read = await readFile(join(folder, name), "utf8").catch(() => null);
		if (read === null) continue;
		try {
			return JSON.parse(read);
		} catch {
			console.error(
				`${join(folder, name)} is not readable JSON, so this widget has no card and every rule that reads one will say it declares nothing.`,
			);
		}
	}
	return null;
}

export function pagedOf(rows, options) {
	const offset = Math.max(0, Number(options.offset) || 0);
	const wanted = Number(options.limit);
	const limit = Number.isFinite(wanted) && wanted > 0 ? Math.min(LARGEST_PAGE, Math.floor(wanted)) : DEFAULT_PAGE;
	return { offset, limit, page: rows.slice(offset, offset + limit) };
}
