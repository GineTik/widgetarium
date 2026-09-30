import { createElement as h } from "react";
import type { FunctionComponent, ReactElement, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { createSlotPart } from "./slot";
import type { SlotPartProps } from "./create-slot-part";

export type TableProps = TableHTMLAttributes<HTMLTableElement>;

export type TableCellProps = SlotPartProps & Pick<TdHTMLAttributes<HTMLTableCellElement>, "colSpan" | "rowSpan">;

export type TableHeadProps = SlotPartProps &
	Pick<ThHTMLAttributes<HTMLTableCellElement>, "colSpan" | "rowSpan" | "scope">;

export function Table({ children, ...props }: TableProps): ReactElement {
	return (
		<div className="wg-kit-table-scroll">
			<table {...domPropsOf(props)} className={cn("wg-kit-table", props.className)}>
				{children}
			</table>
		</div>
	);
}

export const TableHeader: FunctionComponent<SlotPartProps> = createSlotPart(
	"thead",
	(props) => cn("wg-kit-table-header", props.className),
	"TableHeader",
);

export const TableBody: FunctionComponent<SlotPartProps> = createSlotPart(
	"tbody",
	(props) => cn("wg-kit-table-body", props.className),
	"TableBody",
);

export const TableFooter: FunctionComponent<SlotPartProps> = createSlotPart(
	"tfoot",
	(props) => cn("wg-kit-table-footer", props.className),
	"TableFooter",
);

export const TableRow: FunctionComponent<SlotPartProps> = createSlotPart(
	"tr",
	(props) => cn("wg-kit-table-row", props.className),
	"TableRow",
);

export const TableHead: FunctionComponent<TableHeadProps> = createSlotPart<TableHeadProps>(
	"th",
	(props) => cn("wg-kit-table-head", props.className),
	"TableHead",
);

export const TableCell: FunctionComponent<TableCellProps> = createSlotPart<TableCellProps>(
	"td",
	(props) => cn("wg-kit-table-cell", props.className),
	"TableCell",
);

export const TableCaption: FunctionComponent<SlotPartProps> = createSlotPart(
	"caption",
	(props) => cn("wg-kit-table-caption", props.className),
	"TableCaption",
);
