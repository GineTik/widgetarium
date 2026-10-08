import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow, cn } from "../../index";
import { COLUMNS } from "../showcase-data";
import { InvoiceRows } from "./invoice-rows";
import type { InvoiceRowsProps } from "./invoice-rows";

export interface InvoiceTableProps extends InvoiceRowsProps {
	readonly caption: string;
}

export function InvoiceTable({ rows, caption }: InvoiceTableProps): ReactElement {
	return (
		<Table>
			<TableCaption>{caption}</TableCaption>
			<TableHeader>
				<TableRow>
					{COLUMNS.map((column) => (
						<TableHead key={column} className={cn(column === "Amount" && "wg-showcase-end")}>
							{column}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				<InvoiceRows rows={rows} />
			</TableBody>
		</Table>
	);
}
