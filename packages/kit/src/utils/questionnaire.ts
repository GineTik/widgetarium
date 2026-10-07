import {
	CHOICE_INPUT_ATTRIBUTE,
	LETTER_SHORTCUTS,
	NUMBER_SHORTCUTS,
	TEXT_INPUT_ATTRIBUTE,
} from "../constants/questionnaire";
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

export function choiceInputsOf(fieldset: Element): HTMLInputElement[] {
	return Array.from(fieldset.querySelectorAll<HTMLInputElement>(`input[${CHOICE_INPUT_ATTRIBUTE}]:not(:disabled)`));
}

export function textInputsOf(fieldset: Element): HTMLInputElement[] {
	return Array.from(fieldset.querySelectorAll<HTMLInputElement>(`input[${TEXT_INPUT_ATTRIBUTE}]`));
}

export function readingOf(fieldset: Element): ItemReading {
	const picked = choiceInputsOf(fieldset)
		.filter((input) => input.checked)
		.map((input) => input.value);
	const typed = textInputsOf(fieldset).find((input) => input.value.trim() !== "")?.value ?? "";
	return { picked, typed };
}

export function isAnswered(reading: ItemReading): boolean {
	return reading.picked.length > 0 || reading.typed.trim() !== "";
}

export function statusOf(reading: ItemReading, isSkipped: boolean): QuestionStatus {
	if (isAnswered(reading)) return "answered";
	return isSkipped ? "skipped" : "unanswered";
}

export function isSettled({ status, required, invalid }: SettleAsk): boolean {
	if (invalid) return false;
	return status === "answered" || (status === "skipped" && !required);
}

export function shortcutOf(index: number, kind: ShortcutKind | undefined): string | null {
	if (kind === undefined || index < 0) return null;
	return (kind === "letters" ? LETTER_SHORTCUTS : NUMBER_SHORTCUTS)[index] ?? null;
}

export function shortcutIndexOf(key: string, kind: ShortcutKind | undefined): number {
	if (kind === undefined || key.length !== 1) return -1;
	return (kind === "letters" ? LETTER_SHORTCUTS : NUMBER_SHORTCUTS).indexOf(key.toUpperCase());
}

export function neighbourOf(order: readonly string[], name: string | undefined, step: 1 | -1): string | null {
	const at = name === undefined ? -1 : order.indexOf(name);
	if (at < 0) return null;
	return order[at + step] ?? null;
}

export function firstAnswerControlOf(fieldset: Element): HTMLElement | null {
	return fieldset.querySelector<HTMLElement>(
		`input[${CHOICE_INPUT_ATTRIBUTE}]:not(:disabled), input[${TEXT_INPUT_ATTRIBUTE}]:not(:disabled)`,
	);
}

export function isInput(target: EventTarget | null): target is HTMLInputElement {
	return target instanceof Element && target.localName === "input";
}

export function isChoiceInput(target: EventTarget | null): target is HTMLInputElement {
	return isInput(target) && isChoice(target);
}

export function isChoice(input: HTMLInputElement): boolean {
	return input.hasAttribute(CHOICE_INPUT_ATTRIBUTE);
}

export function isTextControl(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
	if (!(target instanceof Element)) return false;
	if (target.localName === "textarea") return true;
	return isInput(target) && !isChoice(target) && target.type !== "button" && target.type !== "submit";
}
