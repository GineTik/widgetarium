import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface QuestionnaireChoiceKeyProps {
	readonly shortcut: string | undefined;
}

export function QuestionnaireChoiceKey({ shortcut }: QuestionnaireChoiceKeyProps): ReactElement | null {
	if (!shortcut) return null;
	return (
		<kbd className="wg-kit-kbd wg-kit-quiz-choice-key" aria-hidden="true">
			{shortcut}
		</kbd>
	);
}
