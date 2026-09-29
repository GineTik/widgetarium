import { useMemo } from "react";
import { valueGateway, type Row } from "widgetarium";
import type { Album, Albums } from "./types";

export function useAlbumSource(albums: Albums, row: Row<Album>) {
	return useMemo(
		() =>
			valueGateway<Album>({
				id: `${albums.id}#${row.ref}`,
				handlers: { get: async () => (await albums.get(row.ref)) ?? row },
				subscribe: albums.subscribe,
			}),
		[albums, row.ref],
	);
}
