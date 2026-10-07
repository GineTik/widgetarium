import type { Step } from "./roving";

export interface ToggleRule {
	readonly isMultiple: boolean;
	readonly isCollapsible: boolean;
}

const DOWN_STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowDown", 1],
	["ArrowUp", -1],
	["Home", "first"],
	["End", "last"],
]);

const ACROSS_STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowRight", 1],
	["ArrowLeft", -1],
	["Home", "first"],
	["End", "last"],
]);

const ACROSS_RTL_STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowLeft", 1],
	["ArrowRight", -1],
	["Home", "first"],
	["End", "last"],
]);

export function stepKeysOf(orientation: string, dir: string | undefined): ReadonlyMap<string, Step> {
	if (orientation !== "horizontal") return DOWN_STEP_OF_KEY;
	return dir === "rtl" ? ACROSS_RTL_STEP_OF_KEY : ACROSS_STEP_OF_KEY;
}

export function openedList(value: string | readonly string[] | undefined): readonly string[] | undefined {
	if (value === undefined) return undefined;
	if (typeof value === "string") return value === "" ? [] : [value];
	return value;
}

export function toggledOpen(opened: readonly string[], value: string, rule: ToggleRule): readonly string[] {
	const isOpen = opened.includes(value);
	if (rule.isMultiple) return isOpen ? opened.filter((held) => held !== value) : [...opened, value];
	if (!isOpen) return [value];
	return rule.isCollapsible ? [] : opened;
}
