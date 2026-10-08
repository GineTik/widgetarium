import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { QuestionnairePosition } from "./questionnaire-context";

export interface QuestionnaireProgressTrackProps {
	readonly position: QuestionnairePosition;
}

export function QuestionnaireProgressTrack({ position }: QuestionnaireProgressTrackProps): ReactElement {
	const share = position.total > 0 ? (position.current / position.total) * 100 : 0;
	return (
		<span className="wg-kit-quiz-progress-track" aria-hidden="true">
			<span className="wg-kit-quiz-progress-fill" style={{ inlineSize: `${share}%` }} />
		</span>
	);
}
