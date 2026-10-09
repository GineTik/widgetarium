import type { z } from "zod";
import type { CommitSchema } from "./widget";

export type Commit = z.infer<typeof CommitSchema>;
