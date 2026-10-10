import { createViewCells } from "../gateway/refs.js";
import type { ViewCell } from "../gateway/refs.js";

export type PageParams = Readonly<Record<string, string>>;

const cellOfParam = createViewCells();

// TRADE-OFF: an app block keys by its note, so two tabs of one block share
export function pageParamCell(keptAt: string, key: string): ViewCell {
	return cellOfParam(`${keptAt}#${key}`);
}

export async function withPageParams(keptAt: string, params: PageParams): Promise<void> {
	for (const [key, value] of Object.entries(params)) await pageParamCell(keptAt, key).update(value);
}
