import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { useQuestionnaireItem } from "./questionnaire-context";

export function QuestionnaireDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>): ReactElement {
	const { ids } = useQuestionnaireItem();
	return (
		<p
			id={ids.description}
			data-slot="questionnaire-description"
			{...rest}
			className={cn("wg-kit-quiz-description", className)}
		/>
	);
}
