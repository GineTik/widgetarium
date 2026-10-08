import { createElement as h } from "react";
import type { FunctionComponent, ReactElement } from "react";
import type { QuestionnaireStepKind } from "../constants/questionnaire";
import type { ButtonProps } from "./button";
import { QuestionnaireStep } from "./questionnaire-step";

export const QuestionnairePrevious: FunctionComponent<ButtonProps> = createStep("previous");

export const QuestionnaireSkip: FunctionComponent<ButtonProps> = createStep("skip");

export const QuestionnaireNext: FunctionComponent<ButtonProps> = createStep("next");

export const QuestionnaireSubmit: FunctionComponent<ButtonProps> = createStep("submit");

function createStep(kind: QuestionnaireStepKind): FunctionComponent<ButtonProps> {
	function Step(props: ButtonProps): ReactElement {
		return <QuestionnaireStep {...props} kind={kind} />;
	}
	Step.displayName = `Questionnaire${kind[0]?.toUpperCase() ?? ""}${kind.slice(1)}`;
	return Step;
}
