import { createElement as h } from "react";
import { Badge } from "../../index";
import type { DataTableColumn } from "../../index";
import { spokenAmount } from "../showcase-data";
import type { Invoice } from "../showcase-data";

export const INVOICE_COLUMNS: readonly DataTableColumn<Invoice>[] = [
	{ key: "id", label: "Invoice", sortable: false, render: (row) => <span className="wg-showcase-code">{row.id}</span> },
	{ key: "client", label: "Client" },
	{
		key: "status",
		label: "Status",
		render: (row) => (
			<Badge tone={row.status.tone} size="s">
				{row.status.label}
			</Badge>
		),
	},
	{ key: "issued", label: "Issued", type: "date" },
	{ key: "due", label: "Due", type: "date" },
	{ key: "owner", label: "Owner" },
	{ key: "project", label: "Project" },
	{ key: "amount", label: "Amount", type: "number", render: (row) => spokenAmount(row.amount) },
];
