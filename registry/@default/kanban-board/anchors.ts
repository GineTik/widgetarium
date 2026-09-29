import { APPROVAL_TONES, PRIORITY_TONES } from "widgetarium/kit";
import { APPROVAL_CHOICES, PRIORITY_CHOICES } from "./choices";
import type { Anchor } from "./types";

const ANCHORS: Record<string, Anchor> = {
	status: { kind: "choice", icon: "columns", word: "one of the board's columns", required: true },
	priority: { kind: "choice", icon: "flag", choices: PRIORITY_CHOICES, tones: PRIORITY_TONES, word: "a priority" },
	approval: { kind: "choice", icon: "seal", choices: APPROVAL_CHOICES, tones: APPROVAL_TONES, word: "an approval" },
	progress: { kind: "progress", icon: "gauge", word: "a number from 0 to 100" },
	deadline: { kind: "date", icon: "calendar", word: "a date" },
	members: { kind: "people", icon: "people", word: "people" },
	assignees: { kind: "people", icon: "people", word: "people" },
};

const TEXT_ANCHOR = { kind: "text", icon: "lines", word: "plain text" };

export function anchorOf(name: string): Anchor {
	const wanted = String(name ?? "")
		.trim()
		.toLowerCase();
	if (!Object.hasOwn(ANCHORS, wanted)) return TEXT_ANCHOR;
	return ANCHORS[wanted] ?? TEXT_ANCHOR;
}
