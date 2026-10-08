import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { DataTable } from "../../index";
import type { SortOrder } from "../../index";
import { CAPTION, INVOICES, ROWS_PER_PAGE } from "../showcase-data";
import { INVOICE_COLUMNS } from "./invoice-columns";
import { sortedInvoices } from "./sorted-invoices";

export function InvoiceDataTable(): ReactElement {
	const [page, setPage] = useState(1);
	const [sort, setSort] = useState<SortOrder>({ key: "amount", direction: "desc" });
	const [picked, setPicked] = useState(INVOICES[2]?.id);
	const count = Math.ceil(INVOICES.length / ROWS_PER_PAGE);
	return (
		<DataTable
			rows={sortedInvoices(sort).slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)}
			columns={INVOICE_COLUMNS}
			rowKey={(row) => row.id}
			sort={sort}
			onSortChange={setSort}
			selected={picked}
			onSelect={setPicked}
			caption={CAPTION.replace("{count}", String(INVOICES.length)).replace("{per}", String(ROWS_PER_PAGE))}
			page={page}
			count={count}
			onPageChange={setPage}
		/>
	);
}
