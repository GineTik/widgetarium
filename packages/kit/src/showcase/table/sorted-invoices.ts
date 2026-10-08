import type { SortOrder } from "../../index";
import { INVOICES } from "../showcase-data";
import type { Invoice } from "../showcase-data";

export function sortedInvoices(sort: SortOrder): readonly Invoice[] {
	if (!sort) return INVOICES;
	const valueOf = (row: Invoice): string => {
		const fields: Readonly<Record<string, Invoice[keyof Invoice]>> = row;
		return String(sort.key === "status" ? row.status.label : fields[sort.key]);
	};
	const ordered = [...INVOICES].sort((left, right) =>
		valueOf(left).localeCompare(valueOf(right), "en", { numeric: true }),
	);
	return sort.direction === "desc" ? ordered.reverse() : ordered;
}
