import type { z } from "zod";
import type { AlbumSchema } from "./widget";

export type Album = z.infer<typeof AlbumSchema>;
