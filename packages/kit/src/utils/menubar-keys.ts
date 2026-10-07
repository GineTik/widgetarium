import type { KeyboardEvent } from "react";
import { MENUBAR_VALUE_ATTRIBUTE } from "../components/menubar-context";
import { isElement } from "./dom-nodes";
import { focusQuietly } from "./focus";
import { stepIndex } from "./roving";
import type { Step } from "./roving";

const STEP_ACROSS: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowRight", 1],
	["ArrowLeft", -1],
	["Home", "first"],
	["End", "last"],
]);

export function moveAcrossTriggers(event: KeyboardEvent<HTMLElement>): void {
	const step = STEP_ACROSS.get(event.key);
	if (step === undefined || !isElement(event.target) || !event.target.hasAttribute(MENUBAR_VALUE_ATTRIBUTE)) return;
	const triggers = [...event.currentTarget.querySelectorAll<HTMLElement>(`[${MENUBAR_VALUE_ATTRIBUTE}]`)];
	const at = triggers.findIndex((trigger) => trigger === event.target);
	event.preventDefault();
	focusQuietly(triggers[stepIndex(at, step, triggers.length)]);
}
