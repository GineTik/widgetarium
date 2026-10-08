import { createElement as h } from "react";
import type { ReactElement } from "react";
import { DataTable, Grid } from "../../index";
import { Cell } from "../frame/cell";
import { INVOICE_COLUMNS } from "./invoice-columns";

export function TableStates(): ReactElement {
	return (
		<Grid min={320}>
			<Cell name="isLoading">
				<DataTable rows={[]} columns={INVOICE_COLUMNS.slice(1, 3)} isLoading />
			</Cell>
			<Cell name="no rows">
				<DataTable rows={[]} columns={INVOICE_COLUMNS.slice(1, 3)} empty="No invoices in this folder yet." />
			</Cell>
			<Cell name="failure">
				<DataTable rows={[]} columns={INVOICE_COLUMNS.slice(1, 3)} failure="Finance/Invoices is gone." />
			</Cell>
		</Grid>
	);
}
