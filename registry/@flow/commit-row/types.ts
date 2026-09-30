import type { z } from "widgetarium";
import type { CommitSchema } from "./widget";

export type Commit = z.infer<typeof CommitSchema>;
