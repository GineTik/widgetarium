import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { RECORD_FILES } from "@widgetarium/core/engine/catalogue-index.js";
import { rankSearch } from "@widgetarium/core/engine/search.js";

export interface PageAsk {
	readonly offset?: unknown;
	readonly limit?: unknown;
}

export interface Page<Row> {
	readonly offset: number;
	readonly limit: number;
	readonly page: Row[];
}

const LARGEST_PAGE = 100;
const DEFAULT_PAGE = 20;

export function matches(entry: object, asked: unknown): boolean {
	return rankSearch(asked, [entry]).length > 0;
}

export async function cardIn(folder: unknown): Promise<unknown> {
	if (typeof folder !== "string" || folder === "") return null;
	for (const name of RECORD_FILES) {
		const read = await readFile(join(folder, name), "utf8").catch(() => null);
		if (read === null) continue;
		try {
			const card: unknown = JSON.parse(read);
			return card;
		} catch {
			console.error(
				`${join(folder, name)} is not readable JSON, so this widget has no card and every rule that reads one will say it declares nothing.`,
			);
		}
	}
	return null;
}

export function pageRows<Row>(rows: readonly Row[], options: PageAsk): Page<Row> {
	const offset = Math.max(0, Number(options.offset) || 0);
	const wanted = Number(options.limit);
	const limit = Number.isFinite(wanted) && wanted > 0 ? Math.min(LARGEST_PAGE, Math.floor(wanted)) : DEFAULT_PAGE;
	return { offset, limit, page: rows.slice(offset, offset + limit) };
}
