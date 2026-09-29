import { IValueGateway, useData, type Row } from "widgetarium";
import { AlbumCell } from "./album-cell";
import type { Album, Albums, Drawn } from "./types";

type PageProps = { albums: Albums; Drawn: Drawn; beside: IValueGateway; offset: number; limit: number };

export function AlbumPage({ albums, Drawn, beside, offset, limit }: PageProps) {
	const listed = useData(albums.list, { offset, limit });
	return (
		<>
			{listed.data.map((row) => (
				<AlbumCell key={row.ref} albums={albums} row={row as Row<Album>} Drawn={Drawn} beside={beside} />
			))}
		</>
	);
}
