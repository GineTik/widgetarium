import { createElement as h } from "react";
import type { ReactElement } from "react";
import { LOADING_ROWS } from "../constants/data-table";
import type { DataColumn } from "../utils/data-table";
import { Skeleton } from "./skeleton";
import { TableCell, TableRow } from "./table";

export interface DataTableLoadingRowsProps {
	readonly columns: readonly Pick<DataColumn, "key">[];
}

const LOADING_LINES = 1;

export function DataTableLoadingRows({ columns }: DataTableLoadingRowsProps): ReactElement[] {
	return Array.from({ length: LOADING_ROWS }, (_, at) => (
		<TableRow key={at} aria-hidden="true">
			{columns.map((column) => (
				<TableCell key={column.key}>
					<Skeleton kind="text" lines={LOADING_LINES} />
				</TableCell>
			))}
		</TableRow>
	));
}
