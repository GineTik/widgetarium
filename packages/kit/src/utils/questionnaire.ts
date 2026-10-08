import { LETTER_SHORTCUTS, NUMBER_SHORTCUTS } from "../constants/questionnaire";
import type { QuestionStatus, ShortcutKind } from "../constants/questionnaire";

export interface ItemReading {
	readonly picked: readonly string[];
	readonly typed: string;
}

export interface SettleAsk {
	readonly status: QuestionStatus;
	readonly required: boolean;
	readonly invalid: boolean;
}

export const NOTHING_READ: ItemReading = { picked: [], typed: "" };

export function isAnswered(reading: ItemReading): boolean {
	return reading.picked.length > 0 || reading.typed.trim() !== "";
}

export function statusOf(reading: ItemReading, isSkipped: boolean): QuestionStatus {
	if (isAnswered(reading)) return "answered";
	return isSkipped ? "skipped" : "unanswered";
}

export function isSkippable(item: { readonly required: boolean } | undefined): boolean {
	return item !== undefined && !item.required;
}

export function isSettled({ status, required, invalid }: SettleAsk): boolean {
	if (invalid) return false;
	return status === "answered" || (status === "skipped" && isSkippable({ required }));
}

export function shortcutOf(index: number, kind: ShortcutKind | undefined): string | null {
	if (kind === undefined || index < 0) return null;
	return shortcutsOf(kind)[index] ?? null;
}

export function shortcutIndexOf(key: string, kind: ShortcutKind | undefined): number {
	if (kind === undefined || key.length !== 1) return -1;
	return shortcutsOf(kind).indexOf(key.toUpperCase());
}

export function neighbourOf(order: readonly string[], name: string | undefined, step: 1 | -1): string | null {
	const at = name === undefined ? -1 : order.indexOf(name);
	if (at < 0) return null;
	return order[at + step] ?? null;
}

function shortcutsOf(kind: ShortcutKind): string {
	return kind === "letters" ? LETTER_SHORTCUTS : NUMBER_SHORTCUTS;
}
