import { createElement as h } from "react";
import type { ReactElement } from "react";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import { formatFindings } from "@widgetarium/core/project/index.js";
import type { ProjectFinding } from "@widgetarium/core/project/index.js";

const PROJECT_REFUSED = "The app at {folder} cannot open:\n{findings}";
const NOT_DRAWN = "The app at {folder} could not be drawn: {failure}";
const REFUSAL_CLASS = "wg-app-refusal";

export function refusalOf(said: string): ReactElement {
	return h("pre", { className: REFUSAL_CLASS }, said);
}

export function reportRefused(folder: string, findings: readonly ProjectFinding[]): string {
	console.warn(`[widgetarium] the app at ${folder} → refused`, findings);
	return PROJECT_REFUSED.replace("{folder}", folder).replace("{findings}", formatFindings(findings));
}

export function reportNotDrawn(folder: string, failure: unknown): string {
	console.error(`[widgetarium] the app at ${folder} → not drawn`, failure);
	return NOT_DRAWN.replace("{folder}", folder).replace("{failure}", failureMessage(failure));
}
