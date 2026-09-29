import { z, type DrawnProps } from "widgetarium";
import type { LogLineSchema, props } from "./widget";

export type Stage = "quiet" | "waiting" | "slow";

export type LogLine = z.infer<typeof LogLineSchema>;

export type TailProps = DrawnProps<typeof props>;
