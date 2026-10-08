import type { FormHTMLAttributes } from "react";
import type { QuestionnaireMachine } from "../hooks/use-questionnaire-machine";
import { keyAnswerOf } from "./questionnaire-keys";

type FormProps = FormHTMLAttributes<HTMLFormElement>;

type FormEvents = Required<Pick<FormProps, "onChange" | "onKeyDown" | "onSubmit" | "onReset">>;

export function formEventsOf(machine: QuestionnaireMachine, said: FormProps): FormEvents {
	return {
		onChange: changeHandlerOf(machine, said),
		onKeyDown: keyDownHandlerOf(machine, said),
		onSubmit: submitHandlerOf(machine, said),
		onReset: resetHandlerOf(machine, said),
	};
}

function changeHandlerOf(machine: QuestionnaireMachine, said: FormProps): FormEvents["onChange"] {
	return (event) => {
		said.onChange?.(event);
		machine.reread(event.target);
	};
}

function keyDownHandlerOf(machine: QuestionnaireMachine, said: FormProps): FormEvents["onKeyDown"] {
	return (event) => {
		said.onKeyDown?.(event);
		const answer = event.defaultPrevented ? null : keyAnswerOf(event, machine);
		if (!answer) return;
		event.preventDefault();
		answer();
	};
}

function submitHandlerOf(machine: QuestionnaireMachine, said: FormProps): FormEvents["onSubmit"] {
	return (event) => {
		if (machine.refuseSubmit(event)) return;
		said.onSubmit?.(event);
		event.preventDefault();
	};
}

function resetHandlerOf(machine: QuestionnaireMachine, said: FormProps): FormEvents["onReset"] {
	return (event) => {
		said.onReset?.(event);
		if (!event.defaultPrevented) machine.restart();
	};
}
