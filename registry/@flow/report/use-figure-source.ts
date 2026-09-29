import { useMemo } from "react";
import { valueGateway, type Row } from "widgetarium";
import type { Figure, FiguresGateway } from "./types";

export function useFigureSource(figures: FiguresGateway, row: Row<Figure>) {
	return useMemo(
		() =>
			valueGateway<Figure>({
				id: `${figures.id}#${row.ref}`,
				handlers: {
					get: async () => {
						if (!figures.get.can().can) return row;
						return (await figures.get(row.ref)) ?? row;
					},
				},
			}),
		[figures, row.ref],
	);
}
