import { z } from "zod";
import type { EntrySchema } from "./widget";

export type Entry = z.infer<typeof EntrySchema>;

export type Look = { isNumbered: boolean; isSolid: boolean };
