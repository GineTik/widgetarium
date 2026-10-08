import { createElement as h } from "react";
import type { ReactNode } from "react";
import { Badge, TableCell, TableRow } from "../../index";
import { spokenAmount } from "../showcase-data";
import type { Invoice } from "../showcase-data";

export interface InvoiceRowsProps {
	readonly rows: readonly Invoice[];
}

export function InvoiceRows({ rows }: InvoiceRowsProps): ReactNode {
	return rows.map((row) => (
		<TableRow key={row.id} data-state={row.status.label === "Overdue" ? "selected" : undefined}>
			<TableCell className="wg-showcase-code">{row.id}</TableCell>
			<TableCell>{row.client}</TableCell>
			<TableCell>
				<Badge tone={row.status.tone} size="s">
					{row.status.label}
				</Badge>
			</TableCell>
			<TableCell>{row.issued}</TableCell>
			<TableCell>{row.due}</TableCell>
			<TableCell>{row.owner}</TableCell>
			<TableCell>{row.project}</TableCell>
			<TableCell className="wg-showcase-end">{spokenAmount(row.amount)}</TableCell>
		</TableRow>
	));
}
