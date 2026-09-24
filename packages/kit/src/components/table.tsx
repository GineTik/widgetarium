import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { slotted } from "./slot";

export function Table({ className: cls, children, ...props }: LooseProps) {
	return (
		<div className="wg-kit-table-scroll">
			<table {...domPropsOf(props)} className={cn("wg-kit-table", cls)}>
				{children}
			</table>
		</div>
	);
}

export const TableHeader = slotted("thead", (props) => cn("wg-kit-table-header", props.className), "TableHeader");

export const TableBody = slotted("tbody", (props) => cn("wg-kit-table-body", props.className), "TableBody");

export const TableFooter = slotted("tfoot", (props) => cn("wg-kit-table-footer", props.className), "TableFooter");

export const TableRow = slotted("tr", (props) => cn("wg-kit-table-row", props.className), "TableRow");

export const TableHead = slotted("th", (props) => cn("wg-kit-table-head", props.className), "TableHead");

export const TableCell = slotted("td", (props) => cn("wg-kit-table-cell", props.className), "TableCell");

export const TableCaption = slotted("caption", (props) => cn("wg-kit-table-caption", props.className), "TableCaption");
