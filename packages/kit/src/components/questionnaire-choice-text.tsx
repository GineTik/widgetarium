import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface QuestionnaireChoiceTextProps {
	readonly descriptionId: string;
	readonly description?: ReactNode;
	readonly children?: ReactNode;
}

export function QuestionnaireChoiceText({
	descriptionId,
	description,
	children,
}: QuestionnaireChoiceTextProps): ReactElement {
	return (
		<span className="wg-kit-quiz-choice-text">
			<span className="wg-kit-quiz-choice-label">{children}</span>
			{description ? (
				<span id={descriptionId} className="wg-kit-quiz-choice-description">
					{description}
				</span>
			) : null}
		</span>
	);
}
