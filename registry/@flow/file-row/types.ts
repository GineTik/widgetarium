import type { z } from "widgetarium";
import type { FileChangeSchema } from "./widget";

export type FileChange = z.infer<typeof FileChangeSchema>;

export type Kind = { icon: string; word: string; mark: string };
