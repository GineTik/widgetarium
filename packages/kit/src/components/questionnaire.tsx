import { createElement as h } from "react";
import type { FormHTMLAttributes, ReactElement } from "react";
import { useQuestionnaireMachine } from "../hooks/use-questionnaire-machine";
import type { QuestionnaireAsk } from "../hooks/use-questionnaire-machine";
import { cn } from "../utils/cn";
import { QuestionnaireContext } from "./questionnaire-context";
import { keyAnswerOf } from "./questionnaire-keys";

export { QuestionnaireActions } from "./questionnaire-actions";
export { QuestionnaireChoice } from "./questionnaire-choice";
export { QuestionnaireChoices } from "./questionnaire-choices";
export { QuestionnaireDescription } from "./questionnaire-description";
export { QuestionnaireError } from "./questionnaire-error";
export { QuestionnaireInput } from "./questionnaire-input";
export { QuestionnaireItem } from "./questionnaire-item";
export { QuestionnaireProgress } from "./questionnaire-progress";
export {
	QuestionnaireNext,
	QuestionnairePrevious,
	QuestionnaireSkip,
	QuestionnaireSubmit,
} from "./questionnaire-steps";
export { QuestionnaireTitle } from "./questionnaire-title";
export type { QuestionnaireChoiceProps } from "./questionnaire-choice";
export type { QuestionnaireInputProps } from "./questionnaire-input";
export type { QuestionnaireItemProps } from "./questionnaire-item";
export type { QuestionnaireProgressProps } from "./questionnaire-progress";

export type QuestionnaireProps = QuestionnaireAsk & FormHTMLAttributes<HTMLFormElement>;

export function Questionnaire(props: QuestionnaireProps): ReactElement {
	const machine = useQuestionnaireMachine(props);
	const { position } = machine.state;
	const { item, defaultItem, items, onItemChange, shortcuts, noValidate = true, className, ...rest } = props;
	return (
		<QuestionnaireContext.Provider value={machine.state}>
			<form
				data-slot="questionnaire"
				data-current={position.current}
				data-total={position.total}
				data-first={position.first ? "" : undefined}
				data-last={position.last ? "" : undefined}
				data-shortcuts={shortcuts}
				{...rest}
				ref={machine.form}
				noValidate={noValidate}
				className={cn("wg-kit-quiz", className)}
				onChange={(event) => {
					rest.onChange?.(event);
					machine.reread(event.target);
				}}
				onKeyDown={(event) => {
					rest.onKeyDown?.(event);
					const answer = event.defaultPrevented ? null : keyAnswerOf(event, machine);
					if (!answer) return;
					event.preventDefault();
					answer();
				}}
				onSubmit={(event) => {
					if (machine.refuseSubmit(event)) return;
					rest.onSubmit?.(event);
					event.preventDefault();
				}}
				onReset={(event) => {
					rest.onReset?.(event);
					if (!event.defaultPrevented) machine.restart();
				}}
			/>
		</QuestionnaireContext.Provider>
	);
}
