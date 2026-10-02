import type { Query, Row, RowsResult } from "@widgetarium/core/gateway/contract.js";

const PAGE_UNASKED = 100;

export function pageOf<T>(rows: readonly Row<T>[], query: Query | undefined): RowsResult<T> {
	const offset = query?.offset ?? 0;
	return { rows: rows.slice(offset, offset + (query?.limit ?? PAGE_UNASKED)), total: rows.length };
}
