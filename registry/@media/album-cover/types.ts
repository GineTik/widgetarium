import type { z } from "widgetarium";
import type { AlbumSchema } from "./widget";

export type Album = z.infer<typeof AlbumSchema>;
