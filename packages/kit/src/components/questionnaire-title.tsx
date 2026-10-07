import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useQuestionnaireItem } from "./questionnaire-context";

export function QuestionnaireTitle({ className, ...rest }: HTMLAttributes<HTMLLegendElement>): ReactElement {
	const { ids } = useQuestionnaireItem();
	return (
		<legend id={ids.title} data-slot="questionnaire-title" {...rest} className={cn("wg-kit-quiz-title", className)} />
	);
}
