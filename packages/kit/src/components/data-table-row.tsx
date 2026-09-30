import { createElement as h } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { cn } from "../utils/cn";
import { alignOf, cellText } from "../utils/data-table";
import type { DataRow } from "../utils/data-table";
import type { DataTableColumn, RowExtra } from "./data-table-shapes";
import { TableCell, TableRow } from "./table";

export interface DataTableRowProps<R extends DataRow> {
	readonly row: R;
	readonly rowKey: string;
	readonly columns: readonly DataTableColumn<R>[];
	readonly isSelected: boolean;
	readonly onSelect?: ((key: string, row: R) => void) | undefined;
	readonly extra: RowExtra;
}

export function DataTableRow<R extends DataRow>({
	row,
	rowKey,
	columns,
	isSelected,
	onSelect,
	extra,
}: DataTableRowProps<R>): ReactElement {
	return (
		<TableRow
			{...extra}
			{...pressableRow(onSelect ? () => onSelect(rowKey, row) : null, isSelected)}
			className={cn(typeof onSelect === "function" && "is-pressable", extra.className)}
			data-state={isSelected ? "selected" : undefined}
		>
			{columns.map((column) => (
				<TableCell key={column.key} data-align={alignOf(column)}>
					{column.render ? column.render(row) : cellText(row[column.key])}
				</TableCell>
			))}
		</TableRow>
	);
}

function pressableRow(press: (() => void) | null, isSelected: boolean): RowExtra {
	if (!press) return {};
	return {
		tabIndex: 0,
		"aria-selected": isSelected,
		onClick: press,
		onKeyDown: (event) => pressOnKey(event, press),
	};
}

function pressOnKey(event: KeyboardEvent, press: () => void): void {
	if (event.key !== "Enter" && event.key !== " ") return;
	event.preventDefault();
	press();
}
