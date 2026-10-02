import { useData, type Row } from "widgetarium";
import type { Album, Albums, Drawn } from "./types";

type PageProps = { albums: Albums; Drawn: Drawn; isBeside: boolean; offset: number; limit: number };

export function AlbumPage({ albums, Drawn, isBeside, offset, limit }: PageProps) {
	const listed = useData(albums, { offset, limit });
	return (
		<>
			{listed.data.map((row) => (
				<Drawn key={row.ref} getAlbum={row as Row<Album>} getBeside={isBeside} />
			))}
		</>
	);
}
