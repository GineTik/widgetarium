import { z, type PropsOf, type Row, type Slot } from "widgetarium";
import type AlbumGrid from "./widget";
import type { AlbumSchema } from "./widget";

export type Album = z.infer<typeof AlbumSchema>;
export type Given = { getAlbum: Row<Album>; getBeside: boolean };
export type CoverSlot = Slot<Given>;
export type Drawn = NonNullable<CoverSlot>;

export type Albums = PropsOf<typeof AlbumGrid>["getAlbums"];
