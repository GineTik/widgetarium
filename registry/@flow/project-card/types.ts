import type { z } from "widgetarium";
import type { ProjectSchema } from "./widget";

export type Project = z.infer<typeof ProjectSchema>;

export type Counted = { field: string; label: string; tone: string; count: number };

export type Head = { mark: string | null; name: string | null; repository: string | null };
