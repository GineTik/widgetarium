import { createElement as h } from "react";
import type { ReactNode } from "react";
import { SORT_ICONS } from "../constants/data-table";
import type { SortDirection } from "../constants/data-table";
import { Icon } from "../icons/icon";
import { buttonClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { nextSort } from "../utils/data-table";
import type { ColumnAlign, SortOrder } from "../utils/data-table";
import type { HeadColumn } from "./data-table-shapes";

export interface DataTableHeadLabelProps {
	readonly column: HeadColumn;
	readonly sort: SortOrder;
	readonly direction: SortDirection | null;
	readonly align: ColumnAlign;
	readonly onSortChange?: ((sort: SortOrder) => void) | undefined;
}

const SORT_ICON_PX = 14;

const SORT_LOOK = buttonClass({ variant: "ghost", size: "s" });

export function DataTableHeadLabel({
	column,
	sort,
	direction,
	align,
	onSortChange,
}: DataTableHeadLabelProps): ReactNode {
	const label = column.label ?? column.key;
	if (typeof onSortChange !== "function" || column.sortable === false) return label;
	const mark = <Icon name={SORT_ICONS[direction ?? "none"]} size={SORT_ICON_PX} />;
	return (
		<button
			type="button"
			className={cn(SORT_LOOK, "wg-kit-data-table-sort")}
			data-sorted={direction ?? undefined}
			onClick={() => onSortChange(nextSort(sort, column.key))}
		>
			{align === "end" ? mark : null}
			{label}
			{align === "end" ? null : mark}
		</button>
	);
}
