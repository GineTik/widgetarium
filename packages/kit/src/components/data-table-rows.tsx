import { createElement as h } from "react";
import type { ReactElement } from "react";
import { keyOfRow } from "../utils/data-table";
import type { DataRow } from "../utils/data-table";
import { DataTableRow } from "./data-table-row";
import type { DataRowsAsk, DataTableColumn } from "./data-table-shapes";

export interface DataTableRowsProps<R extends DataRow> extends DataRowsAsk<R> {
	readonly rows: readonly R[];
	readonly columns: readonly DataTableColumn<R>[];
}

export function DataTableRows<R extends DataRow>({
	rows,
	columns,
	rowKey = keyOfRow,
	selected,
	onSelect,
	rowProps,
}: DataTableRowsProps<R>): ReactElement[] {
	return rows.map((row, index) => {
		const key = rowKey(row, index);
		return (
			<DataTableRow
				key={key}
				row={row}
				rowKey={key}
				columns={columns}
				isSelected={selected !== undefined && selected === key}
				onSelect={onSelect}
				extra={rowProps?.(row) ?? {}}
			/>
		);
	});
}
