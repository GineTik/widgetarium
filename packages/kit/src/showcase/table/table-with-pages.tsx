import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Pagination } from "../../index";
import { Named } from "../frame/named";
import { INVOICES, NARROW_CAPTION, ROWS_PER_PAGE } from "../showcase-data";
import { HandBuiltPages } from "./hand-built-pages";
import { InvoiceDataTable } from "./invoice-data-table";
import { InvoiceTable } from "./invoice-table";
import { TableStates } from "./table-states";

export function TableWithPages(): ReactElement {
	const [page, setPage] = useState(1);
	const [longPage, setLongPage] = useState(10);
	const count = Math.ceil(INVOICES.length / ROWS_PER_PAGE);
	return (
		<div className="wg-showcase-stack">
			<Named name="DataTable · sort by a head, select a row">
				<InvoiceDataTable />
			</Named>
			<TableStates />
			<Named name="count={20} · a gap on each side">
				<Pagination page={longPage} count={20} onPageChange={setLongPage} />
			</Named>
			<Named name='variant="compact"'>
				<Pagination page={longPage} count={20} onPageChange={setLongPage} variant="compact" />
			</Named>
			<Named name="Parts, for a pagination the ready one cannot draw">
				<HandBuiltPages page={page} count={count} onPage={setPage} />
			</Named>
			<div className="wg-showcase-narrow wg-showcase-stack">
				<Named name="Table parts, for a table DataTable cannot draw">
					<InvoiceTable rows={INVOICES.slice(0, 3)} caption={NARROW_CAPTION} />
				</Named>
				<Named name="The same full pagination, turned compact by the narrow region">
					<Pagination page={page} count={count} onPageChange={setPage} />
				</Named>
			</div>
		</div>
	);
}
