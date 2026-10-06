import { createViewCells } from "../gateway/refs.js";
import type { ViewCell } from "../gateway/refs.js";

export type PageParams = Readonly<Record<string, string>>;

const cellOfParam = createViewCells();

// TRADE-OFF: kept per note, not per tab; two tabs of one note share their parameters
export function pageParamCell(notePath: string, key: string): ViewCell {
	return cellOfParam(`${notePath}#${key}`);
}

export async function withPageParams(notePath: string, params: PageParams): Promise<void> {
	for (const [key, value] of Object.entries(params)) await pageParamCell(notePath, key).update(value);
}
