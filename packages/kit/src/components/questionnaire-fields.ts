import { CHOICE_INPUT_ATTRIBUTE, TEXT_INPUT_ATTRIBUTE } from "../constants/questionnaire";
import type { ItemReading } from "../utils/questionnaire";

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

export function firstAnswerControlOf(fieldset: Element): HTMLElement | null {
	return fieldset.querySelector<HTMLElement>(
		`input[${CHOICE_INPUT_ATTRIBUTE}]:not(:disabled), input[${TEXT_INPUT_ATTRIBUTE}]:not(:disabled)`,
	);
}

export function isInputTarget(target: EventTarget | null): target is HTMLInputElement {
	return target instanceof Element && target.localName === "input";
}

export function isChoiceTarget(target: EventTarget | null): target is HTMLInputElement {
	return isInputTarget(target) && isChoiceControl(target);
}

export function isChoiceControl(input: HTMLInputElement): boolean {
	return input.hasAttribute(CHOICE_INPUT_ATTRIBUTE);
}

export function isTextTarget(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
	if (!(target instanceof Element)) return false;
	if (target.localName === "textarea") return true;
	return isInputTarget(target) && !isChoiceControl(target) && target.type !== "button" && target.type !== "submit";
}
