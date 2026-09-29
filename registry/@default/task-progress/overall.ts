import type { OverallStatus, Step } from "./types";

export const TICK_MS = 1000;
export const NO_STEPS = "No steps yet.";

export function overallOf(steps: readonly Step[]): OverallStatus {
	if (steps.some((step) => step.status === "active")) return "running";
	if (steps.some((step) => step.status === "failed")) return "failed";
	if (steps.length > 0 && steps.every((step) => step.status === "done")) return "done";
	return "stopped";
}
