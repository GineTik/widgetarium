import { z, type DrawnProps, type Row, type Slot } from "widgetarium";
import type { AlbumSchema, props } from "./widget";

export type Album = z.infer<typeof AlbumSchema>;
export type Given = { getAlbum: Row<Album>; getBeside: boolean };
export type CoverSlot = Slot<Given>;
export type Drawn = NonNullable<CoverSlot>;

export type Albums = DrawnProps<typeof props>["getAlbums"];
