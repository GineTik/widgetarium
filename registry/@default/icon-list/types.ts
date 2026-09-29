import { z } from "widgetarium";
import type { EntrySchema } from "./widget";

export type Entry = z.infer<typeof EntrySchema>;

export type Look = { isNumbered: boolean; isSolid: boolean };
