import { z, type Row, type Slot } from "widgetarium";
import type { ProjectSchema } from "./widget";

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectSlot = Slot<{ getProject: Row<Project> }>;
export type Drawn = NonNullable<ProjectSlot>;
