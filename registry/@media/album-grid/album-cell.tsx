import { IValueGateway, type Row } from "widgetarium";
import type { Album, Albums, Drawn } from "./types";
import { useAlbumSource } from "./use-album-source";

type CellProps = { albums: Albums; row: Row<Album>; Drawn: Drawn; beside: IValueGateway };

export function AlbumCell({ albums, row, Drawn, beside }: CellProps) {
	return <Drawn getAlbum={useAlbumSource(albums, row)} getBeside={beside} />;
}
