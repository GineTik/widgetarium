import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useQuestionnaireItem } from "./questionnaire-context";

export function QuestionnaireChoices({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement {
	const { shortcuts } = useQuestionnaireItem();
	return (
		<div
			data-slot="questionnaire-choices"
			data-shortcuts={shortcuts}
			{...rest}
			className={cn("wg-kit-quiz-choices", className)}
		/>
	);
}
