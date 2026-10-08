import { createElement as h } from "react";
import type { FunctionComponent, ReactElement } from "react";
import { STEP_LABELS } from "../constants/questionnaire";
import type { QuestionnaireStepKind } from "../constants/questionnaire";
import { cn } from "../utils/cn";
import { Button } from "./button";
import type { ButtonProps } from "./button";
import { useQuestionnaire } from "./questionnaire-context";
import type { QuestionnaireState } from "./questionnaire-context";

export const QuestionnairePrevious: FunctionComponent<ButtonProps> = createStep("previous");

export const QuestionnaireSkip: FunctionComponent<ButtonProps> = createStep("skip");

export const QuestionnaireNext: FunctionComponent<ButtonProps> = createStep("next");

export const QuestionnaireSubmit: FunctionComponent<ButtonProps> = createStep("submit");

function createStep(kind: QuestionnaireStepKind): FunctionComponent<ButtonProps> {
	const isLeading = kind === "next" || kind === "submit";
	function Step({ variant, onClick, children, className, ...rest }: ButtonProps): ReactElement {
		const root = useQuestionnaire();
		const isVisible = isStepVisible(kind, root);
		const shortcut = isLeading && isVisible && !rest.disabled ? "Enter" : undefined;
		return (
			<Button
				data-slot={`questionnaire-${kind}`}
				data-visible={isVisible ? "" : undefined}
				data-hidden={isVisible ? undefined : ""}
				data-shortcut={shortcut}
				data-status={root.active === undefined ? undefined : root.statusOf(root.active)}
				aria-keyshortcuts={shortcut}
				hidden={!isVisible}
				inert={!isVisible}
				variant={variant ?? (isLeading ? "default" : "ghost")}
				{...rest}
				type={kind === "submit" ? "submit" : "button"}
				className={cn("wg-kit-quiz-step", className)}
				onClick={(event) => {
					onClick?.(event);
					if (!event.defaultPrevented && kind !== "submit") root[kind]();
				}}
			>
				{children ?? STEP_LABELS[kind]}
			</Button>
		);
	}
	Step.displayName = `Questionnaire${kind[0]?.toUpperCase() ?? ""}${kind.slice(1)}`;
	return Step;
}

function isStepVisible(kind: QuestionnaireStepKind, { isActiveSkippable, position }: QuestionnaireState): boolean {
	if (kind === "previous") return !position.first;
	if (kind === "skip") return isActiveSkippable;
	if (kind === "next") return !position.last;
	return position.last;
}
