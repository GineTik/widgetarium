import type { KeyboardEvent } from "react";
import { MENUBAR_VALUE_ATTRIBUTE } from "../components/menubar-context";
import { isElement } from "./dom-nodes";
import { focusQuietly } from "./focus";
import { focusStepped } from "./focus-step";
import { ROW_STEP_OF_KEY } from "./roving";

export function moveAcrossTriggers(event: KeyboardEvent<HTMLElement>): void {
	if (!isElement(event.target) || !event.target.hasAttribute(MENUBAR_VALUE_ATTRIBUTE)) return;
	const triggers = [...event.currentTarget.querySelectorAll<HTMLElement>(`[${MENUBAR_VALUE_ATTRIBUTE}]`)];
	focusStepped(event, triggers, ROW_STEP_OF_KEY.get(event.key), { focus: focusQuietly, from: event.target });
}
