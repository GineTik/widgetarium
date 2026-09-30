import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import type { DataRow, SortOrder } from "../utils/data-table";
import { DataTableBody } from "./data-table-body";
import { DataTableColumnHead } from "./data-table-column-head";
import type { DataRowsAsk, DataTableColumn } from "./data-table-shapes";
import { Pagination } from "./pagination";
import { Table, TableBody, TableCaption, TableHeader, TableRow } from "./table";

export type { DataRowsAsk, DataTableColumn, RowExtra } from "./data-table-shapes";

export interface DataTableProps<R extends DataRow = DataRow> extends DataRowsAsk<R> {
	readonly columns?: readonly DataTableColumn<R>[] | undefined;
	readonly sort?: SortOrder | undefined;
	readonly onSortChange?: ((sort: SortOrder) => void) | undefined;
	readonly caption?: ReactNode;
	readonly page?: number | undefined;
	readonly count?: number | undefined;
	readonly onPageChange?: ((page: number) => void) | undefined;
	readonly className?: string | undefined;
}

export function DataTable<R extends DataRow = DataRow>({
	columns = [],
	sort = null,
	onSortChange,
	caption,
	page,
	count,
	onPageChange,
	className: cls,
	...body
}: DataTableProps<R>): ReactElement {
	return (
		<div className={cn("wg-kit-data-table", cls)}>
			<Table>
				{caption ? <TableCaption>{caption}</TableCaption> : null}
				<TableHeader>
					<TableRow>
						{columns.map((column) => (
							<DataTableColumnHead key={column.key} column={column} sort={sort} onSortChange={onSortChange} />
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					<DataTableBody {...body} columns={columns} />
				</TableBody>
			</Table>
			<Pagination page={page} count={count} onPageChange={onPageChange} />
		</div>
	);
}
