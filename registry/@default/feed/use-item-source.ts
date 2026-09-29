import { useMemo } from "react";
import { valueGateway, type Row } from "widgetarium";
import type { Item, Items } from "./types";

export function useItemSource(items: Items, row: Row<Item>) {
	return useMemo(
		() =>
			valueGateway<Item>({
				id: `${items.id}#${row.ref}`,
				handlers: {
					get: async () => {
						if (!items.get?.can().can) return row;
						return (await items.get(row.ref)) ?? row;
					},
				},
			}),
		[items, row.ref],
	);
}
