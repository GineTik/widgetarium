import { createElement as h } from "react";
import type { FormHTMLAttributes, ReactElement } from "react";
import { useQuestionnaireMachine } from "../hooks/use-questionnaire-machine";
import type { QuestionnaireAsk } from "../hooks/use-questionnaire-machine";
import { cn } from "../utils/cn";
import { QuestionnaireContext } from "./questionnaire-context";
import { formEventsOf } from "./questionnaire-form-events";
import { positionDataOf } from "./questionnaire-position-data";

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
	const { item, defaultItem, items, onItemChange, shortcuts, noValidate = true, className, ...rest } = props;
	return (
		<QuestionnaireContext.Provider value={machine.state}>
			<form
				data-slot="questionnaire"
				{...positionDataOf(machine.state.position)}
				data-shortcuts={shortcuts}
				{...rest}
				ref={machine.form}
				noValidate={noValidate}
				className={cn("wg-kit-quiz", className)}
				{...formEventsOf(machine, rest)}
			/>
		</QuestionnaireContext.Provider>
	);
}
