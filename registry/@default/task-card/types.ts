import type { z } from "zod";
import type { TaskSchema } from "./widget";

export type Task = z.infer<typeof TaskSchema>;
