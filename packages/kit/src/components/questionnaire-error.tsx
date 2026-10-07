import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { OPTIONAL_ERROR, REQUIRED_ERROR } from "../constants/questionnaire";
import { cn } from "../utils/cn";
import { useQuestionnaireItem } from "./questionnaire-context";

export function QuestionnaireError({
	className,
	children,
	...rest
}: HTMLAttributes<HTMLParagraphElement>): ReactElement {
	const { ids, isInvalid, required } = useQuestionnaireItem();
	return (
		<p
			id={ids.error}
			hidden={!isInvalid}
			data-slot="questionnaire-error"
			data-invalid={isInvalid ? "" : undefined}
			{...rest}
			className={cn("wg-kit-quiz-error", className)}
		>
			{children ?? (required ? REQUIRED_ERROR : OPTIONAL_ERROR)}
		</p>
	);
}
