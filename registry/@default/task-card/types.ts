import type { z } from "widgetarium";
import type { TaskSchema } from "./widget";

export type Task = z.infer<typeof TaskSchema>;
