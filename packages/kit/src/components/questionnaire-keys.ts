import type { KeyboardEvent } from "react";
import { ANSWER_MOVE_KEYS } from "../constants/questionnaire";
import type { QuestionnaireMachine } from "../hooks/use-questionnaire-machine";
import { shortcutIndexOf } from "../utils/questionnaire";
import { choiceInputsOf, isChoiceTarget, isTextTarget } from "./questionnaire-fields";

type KeyAnswer = () => void;

export function keyAnswerOf(event: KeyboardEvent<HTMLFormElement>, machine: QuestionnaireMachine): KeyAnswer | null {
	if (event.metaKey || event.ctrlKey || event.altKey) return modifiedKeyAnswerOf(event, machine);
	return targetKeyAnswerOf(event.key, event.target, machine);
}

function modifiedKeyAnswerOf(event: KeyboardEvent<HTMLFormElement>, machine: QuestionnaireMachine): KeyAnswer | null {
	const isCommandEnter = event.key === "Enter" && (event.metaKey || event.ctrlKey);
	if (!isCommandEnter) return null;
	return machine.state.next;
}

function targetKeyAnswerOf(key: string, target: EventTarget, machine: QuestionnaireMachine): KeyAnswer | null {
	if (isTextTarget(target)) return textKeyAnswerOf(key, target, machine);
	if (target instanceof Element && target.localName === "button") return null;
	if (isChoiceTarget(target)) return choiceKeyAnswerOf(key, target, machine);
	return looseKeyAnswerOf(key, machine);
}

function textKeyAnswerOf(
	key: string,
	control: HTMLInputElement | HTMLTextAreaElement,
	machine: QuestionnaireMachine,
): KeyAnswer | null {
	if (key !== "Enter" || control.localName !== "input" || control.value.trim() === "") return null;
	return machine.state.next;
}

function choiceKeyAnswerOf(key: string, input: HTMLInputElement, machine: QuestionnaireMachine): KeyAnswer | null {
	if (key === "Enter") return machine.advanceIfSettled() ?? blockImplicitSubmit;
	if (input.type === "radio" && isArrowKey(key)) return null;
	const step = ANSWER_MOVE_KEYS[key];
	if (step !== undefined) return () => focusNeighbour(input, step);
	return looseKeyAnswerOf(key, machine);
}

function isArrowKey(key: string): boolean {
	return ANSWER_MOVE_KEYS[key] !== undefined || key === "ArrowLeft" || key === "ArrowRight";
}

function looseKeyAnswerOf(key: string, machine: QuestionnaireMachine): KeyAnswer | null {
	if (key === "ArrowLeft") return machine.state.previous;
	if (key === "ArrowRight") return machine.advanceIfSettled();
	const input = shortcutInputOf(key, machine);
	if (!input) return null;
	return () => {
		input.focus();
		input.click();
	};
}

function shortcutInputOf(key: string, machine: QuestionnaireMachine): HTMLInputElement | undefined {
	const fieldset = machine.activeElement();
	const index = shortcutIndexOf(key, machine.state.shortcuts);
	if (!fieldset || index < 0) return undefined;
	return choiceInputsOf(fieldset)[index];
}

function blockImplicitSubmit(): void {}

function focusNeighbour(input: HTMLInputElement, step: 1 | -1): void {
	const fieldset = input.closest("fieldset");
	if (!fieldset) return;
	const inputs = choiceInputsOf(fieldset);
	inputs[inputs.indexOf(input) + step]?.focus();
}
