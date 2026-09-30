import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { TableCell, TableRow } from "./table";

export interface DataTableLoneRowProps {
	readonly columns: readonly unknown[];
	readonly text: ReactNode;
	readonly isFailure?: boolean;
}

export function DataTableLoneRow({ columns, text, isFailure = false }: DataTableLoneRowProps): ReactElement {
	return (
		<TableRow>
			<TableCell
				colSpan={Math.max(columns.length, 1)}
				className="wg-kit-data-table-said"
				data-failure={isFailure ? "" : undefined}
			>
				{text}
			</TableCell>
		</TableRow>
	);
}
