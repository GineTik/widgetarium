import { z, type PropsOf } from "widgetarium";
import type SessionTail from "./widget";
import type { LogLineSchema } from "./widget";

export type Stage = "quiet" | "waiting" | "slow";

export type LogLine = z.infer<typeof LogLineSchema>;

export type TailProps = PropsOf<typeof SessionTail>;
