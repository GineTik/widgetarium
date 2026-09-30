import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SPOKEN_SORT } from "../constants/data-table";
import { alignOf } from "../utils/data-table";
import type { SortOrder } from "../utils/data-table";
import { DataTableHeadLabel } from "./data-table-head-label";
import type { HeadColumn } from "./data-table-shapes";
import { TableHead } from "./table";

export interface DataTableColumnHeadProps {
	readonly column: HeadColumn;
	readonly sort: SortOrder;
	readonly onSortChange?: ((sort: SortOrder) => void) | undefined;
}

export function DataTableColumnHead({ column, sort, onSortChange }: DataTableColumnHeadProps): ReactElement {
	const direction = sort?.key === column.key ? sort.direction : null;
	const align = alignOf(column);
	return (
		<TableHead data-align={align} aria-sort={direction ? SPOKEN_SORT[direction] : undefined}>
			<DataTableHeadLabel column={column} sort={sort} direction={direction} align={align} onSortChange={onSortChange} />
		</TableHead>
	);
}
