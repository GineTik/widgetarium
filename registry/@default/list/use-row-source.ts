import { useMemo } from "react";
import { IValueGateway, valueGateway, type VaultRecord } from "widgetarium";
import type { Entry, Rows } from "./types";

// TRADE-OFF: the row's contents go in the gateway id; one id per ref settles once and never reads the changed row again
export function useRowSource(rows: Rows, row: Entry): IValueGateway {
	const stamp = JSON.stringify(row);
	return useMemo(
		() =>
			valueGateway<VaultRecord>({
				id: `${rows.id}#${String(row.ref)}#${stamp}`,
				handlers: {
					get: () => row,
					update: (next: VaultRecord) => rows.update({ ref: row.ref, data: next }),
				},
				cans: { update: () => rows.update.can() },
				settlesNow: true,
			}),
		[rows, row.ref, stamp],
	) as IValueGateway;
}
