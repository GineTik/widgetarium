import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { PROGRESS_LABEL, progressText } from "../constants/questionnaire";
import { cn } from "../utils/cn";
import { useQuestionnaire } from "./questionnaire-context";
import type { QuestionnairePosition } from "./questionnaire-context";
import { QuestionnaireProgressTrack } from "./questionnaire-progress-track";

export interface QuestionnaireProgressProps extends HTMLAttributes<HTMLDivElement> {
	readonly render?: ((position: QuestionnairePosition) => ReactNode) | undefined;
}

export function QuestionnaireProgress({
	render,
	children,
	className,
	...rest
}: QuestionnaireProgressProps): ReactElement {
	const { position } = useQuestionnaire();
	const text = progressText(position.current, position.total);
	return (
		<div
			{...progressbarAriaOf(position, text)}
			data-slot="questionnaire-progress"
			data-current={position.current}
			data-total={position.total}
			{...rest}
			className={cn("wg-kit-quiz-progress", className)}
		>
			{render ? render(position) : (children ?? <span className="wg-kit-quiz-progress-text">{text}</span>)}
			<QuestionnaireProgressTrack position={position} />
		</div>
	);
}

function progressbarAriaOf(position: QuestionnairePosition, text: string): HTMLAttributes<HTMLDivElement> {
	return {
		role: "progressbar",
		"aria-label": PROGRESS_LABEL,
		"aria-valuemin": 0,
		"aria-valuemax": position.total,
		"aria-valuenow": position.current,
		"aria-valuetext": text,
	};
}
