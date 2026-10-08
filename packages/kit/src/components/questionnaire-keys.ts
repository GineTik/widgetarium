import type { KeyboardEvent } from "react";
import { ANSWER_MOVE_KEYS } from "../constants/questionnaire";
import type { QuestionnaireMachine } from "../hooks/use-questionnaire-machine";
import { shortcutIndexOf } from "../utils/questionnaire";
import { choiceInputsOf, isChoiceTarget, isTextTarget } from "./questionnaire-fields";

type KeyAnswer = () => void;

export function keyAnswerOf(event: KeyboardEvent<HTMLFormElement>, machine: QuestionnaireMachine): KeyAnswer | null {
	const { key, target } = event;
	if (key === "Enter" && (event.metaKey || event.ctrlKey)) return machine.state.next;
	if (event.metaKey || event.ctrlKey || event.altKey) return null;
	if (isTextTarget(target)) return isFilledLineEnter(key, target) ? machine.state.next : null;
	if (target instanceof Element && target.localName === "button") return null;
	if (isChoiceTarget(target)) return choiceKeyAnswerOf(key, target, machine);
	return looseKeyAnswerOf(key, machine);
}

function choiceKeyAnswerOf(key: string, input: HTMLInputElement, machine: QuestionnaireMachine): KeyAnswer | null {
	if (key === "Enter") return machine.advanceIfSettled() ?? blockImplicitSubmit;
	const step = ANSWER_MOVE_KEYS[key];
	const isArrow = step !== undefined || key === "ArrowLeft" || key === "ArrowRight";
	if (input.type === "radio" && isArrow) return null;
	if (step !== undefined) return () => focusNeighbour(input, step);
	return looseKeyAnswerOf(key, machine);
}

function looseKeyAnswerOf(key: string, machine: QuestionnaireMachine): KeyAnswer | null {
	if (key === "ArrowLeft") return machine.state.previous;
	if (key === "ArrowRight") return machine.advanceIfSettled();
	const fieldset = machine.activeElement();
	const index = shortcutIndexOf(key, machine.state.shortcuts);
	const input = fieldset && index >= 0 ? choiceInputsOf(fieldset)[index] : undefined;
	if (!input) return null;
	return () => {
		input.focus();
		input.click();
	};
}

function isFilledLineEnter(key: string, control: HTMLInputElement | HTMLTextAreaElement): boolean {
	return key === "Enter" && control.localName === "input" && control.value.trim() !== "";
}

function blockImplicitSubmit(): void {}

function focusNeighbour(input: HTMLInputElement, step: 1 | -1): void {
	const fieldset = input.closest("fieldset");
	if (!fieldset) return;
	const inputs = choiceInputsOf(fieldset);
	inputs[inputs.indexOf(input) + step]?.focus();
}
