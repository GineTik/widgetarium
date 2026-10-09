import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PROGRESS_MAX } from "../constants/progress";
import { ProgressBar } from "./progress-bar";
import type { QuestionnairePosition } from "./questionnaire-context";

export interface QuestionnaireProgressTrackProps {
	readonly position: QuestionnairePosition;
}

export function QuestionnaireProgressTrack({ position }: QuestionnaireProgressTrackProps): ReactElement {
	const share = position.total > 0 ? (position.current / position.total) * PROGRESS_MAX : 0;
	return (
		<div aria-hidden="true">
			<ProgressBar value={share} />
		</div>
	);
}
