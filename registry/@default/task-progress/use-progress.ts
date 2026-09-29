import { useData, type DrawnProps, type Row } from "widgetarium";
import { useNow } from "widgetarium/kit";
import { TICK_MS } from "./overall";
import type { Progress, Step, StepStatus } from "./types";
import type { props } from "./widget";

const MOST_STEPS = 50;

const STEP_STATUSES: readonly unknown[] = ["pending", "active", "done", "failed"];

export function useProgress({ title, steps, open, startedAt, endedAt }: DrawnProps<typeof props>): Progress {
	const rows = (useData(steps.list, { limit: MOST_STEPS }).data ?? []) as readonly Row<Step>[];
	const clockNow = useNow(TICK_MS, startedAt > 0 && endedAt === 0);
	return {
		title,
		rows: rows.map(stepOf),
		isOpen: open.value,
		clock: startedAt > 0 ? saidClock((endedAt || clockNow) - startedAt) : "",
	};
}

function saidClock(ms: number): string {
	const seconds = Math.max(0, Math.floor(ms / TICK_MS));
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function stepOf(row: Row<Step>): Row<Step> {
	const status = (STEP_STATUSES.includes(row.status) ? row.status : "pending") as StepStatus;
	return { ref: row.ref, label: String(row.label ?? ""), status, hint: String(row.hint ?? "") };
}
