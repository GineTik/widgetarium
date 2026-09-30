import type { HTMLAttributes, ReactNode } from "react";
import type { DataColumn, DataRow } from "../utils/data-table";

export interface DataTableColumn<R extends DataRow = DataRow> extends Omit<DataColumn, "label"> {
	readonly label?: ReactNode;
	readonly render?: ((row: R) => ReactNode) | undefined;
}

export type HeadColumn = Omit<DataTableColumn, "render">;

export type RowExtra = HTMLAttributes<HTMLElement>;

export interface DataRowsAsk<R extends DataRow = DataRow> {
	readonly rows?: readonly R[] | undefined;
	readonly isLoading?: boolean | undefined;
	readonly failure?: ReactNode;
	readonly empty?: ReactNode;
	readonly rowKey?: ((row: R, index: number) => string) | undefined;
	readonly selected?: string | undefined;
	readonly onSelect?: ((key: string, row: R) => void) | undefined;
	readonly rowProps?: ((row: R) => RowExtra) | undefined;
}
