import { createElement as h } from "react";
import type { ReactNode } from "react";
import { NOTHING_HERE } from "../constants/data-table";
import type { DataRow } from "../utils/data-table";
import { DataTableLoadingRows } from "./data-table-loading-rows";
import { DataTableLoneRow } from "./data-table-lone-row";
import { DataTableRows } from "./data-table-rows";
import type { DataRowsAsk, DataTableColumn } from "./data-table-shapes";

export interface DataTableBodyProps<R extends DataRow> extends DataRowsAsk<R> {
	readonly columns: readonly DataTableColumn<R>[];
}

export function DataTableBody<R extends DataRow>({
	rows = [],
	columns,
	isLoading,
	failure,
	empty = NOTHING_HERE,
	...rowsProps
}: DataTableBodyProps<R>): ReactNode {
	if (isLoading && rows.length === 0) return <DataTableLoadingRows columns={columns} />;
	if (failure) return <DataTableLoneRow columns={columns} text={failure} isFailure />;
	if (rows.length === 0) return <DataTableLoneRow columns={columns} text={empty} />;
	return <DataTableRows {...rowsProps} rows={rows} columns={columns} />;
}
