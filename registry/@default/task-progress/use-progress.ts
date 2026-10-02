import { useData, type DrawnProps, type Row } from "widgetarium";
import { useNow } from "widgetarium/kit";
import { TICK_MS } from "./overall";
import type { Progress, Step } from "./types";
import type { props } from "./widget";

const MOST_STEPS = 50;

export function useProgress({
	getTitle: title,
	getSteps,
	getIsOpen: isOpen,
	getStartedAt: startedAt,
	getEndedAt: endedAt,
}: DrawnProps<typeof props>): Progress {
	const rows = useData(getSteps, { limit: MOST_STEPS }).data;
	const clockNow = useNow(TICK_MS, startedAt > 0 && endedAt === 0);
	return {
		title,
		rows: rows.map(stepOf),
		isOpen,
		clock: startedAt > 0 ? saidClock((endedAt || clockNow) - startedAt) : "",
	};
}

function saidClock(ms: number): string {
	const seconds = Math.max(0, Math.floor(ms / TICK_MS));
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function stepOf(row: Row<Step>): Row<Step> {
	return { ref: row.ref, label: String(row.label ?? ""), status: row.status, hint: String(row.hint ?? "") };
}
