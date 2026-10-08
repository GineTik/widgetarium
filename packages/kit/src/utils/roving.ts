export type Step = number | "first" | "last";

export function stepIndex(at: number, step: Step, count: number): number {
	if (step === "first") return 0;
	if (step === "last") return count - 1;
	if (at === -1) return step > 0 ? 0 : count - 1;
	return (at + step + count) % count;
}

export const UP_DOWN_STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowDown", 1],
	["ArrowUp", -1],
]);

export const COLUMN_STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	...UP_DOWN_STEP_OF_KEY,
	["Home", "first"],
	["End", "last"],
]);

export const ROW_STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowRight", 1],
	["ArrowLeft", -1],
	["Home", "first"],
	["End", "last"],
]);

export const ROW_RTL_STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowLeft", 1],
	["ArrowRight", -1],
	["Home", "first"],
	["End", "last"],
]);

export const ANY_ARROW_STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowRight", 1],
	["ArrowDown", 1],
	["ArrowLeft", -1],
	["ArrowUp", -1],
	["Home", "first"],
	["End", "last"],
]);

export function stepKeysOf(orientation: string, dir: string | undefined): ReadonlyMap<string, Step> {
	if (orientation !== "horizontal") return COLUMN_STEP_OF_KEY;
	return dir === "rtl" ? ROW_RTL_STEP_OF_KEY : ROW_STEP_OF_KEY;
}
