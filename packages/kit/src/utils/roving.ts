export type Step = number | "first" | "last";

export function stepIndex(at: number, step: Step, count: number): number {
	if (step === "first") return 0;
	if (step === "last") return count - 1;
	if (at === -1) return step > 0 ? 0 : count - 1;
	return (at + step + count) % count;
}

export const ACROSS_STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowRight", 1],
	["ArrowDown", 1],
	["ArrowLeft", -1],
	["ArrowUp", -1],
	["Home", "first"],
	["End", "last"],
]);
