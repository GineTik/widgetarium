import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { createSlotPart } from "./slot";

export function Table({ className: cls, children, ...props }: LooseProps) {
	return (
		<div className="wg-kit-table-scroll">
			<table {...domPropsOf(props)} className={cn("wg-kit-table", cls)}>
				{children}
			</table>
		</div>
	);
}

export const TableHeader = createSlotPart(
	"thead",
	(props) => cn("wg-kit-table-header", props.className),
	"TableHeader",
);

export const TableBody = createSlotPart("tbody", (props) => cn("wg-kit-table-body", props.className), "TableBody");

export const TableFooter = createSlotPart(
	"tfoot",
	(props) => cn("wg-kit-table-footer", props.className),
	"TableFooter",
);

export const TableRow = createSlotPart("tr", (props) => cn("wg-kit-table-row", props.className), "TableRow");

export const TableHead = createSlotPart("th", (props) => cn("wg-kit-table-head", props.className), "TableHead");

export const TableCell = createSlotPart("td", (props) => cn("wg-kit-table-cell", props.className), "TableCell");

export const TableCaption = createSlotPart(
	"caption",
	(props) => cn("wg-kit-table-caption", props.className),
	"TableCaption",
);
