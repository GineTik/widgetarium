import { z, type Row } from "widgetarium";
import type { StepSchema } from "./widget";

export type Step = z.infer<typeof StepSchema>;
export type StepStatus = Step["status"];
export type OverallStatus = "running" | "done" | "failed" | "stopped";
export type Progress = { title: string; rows: Row<Step>[]; isOpen: boolean; clock: string };
