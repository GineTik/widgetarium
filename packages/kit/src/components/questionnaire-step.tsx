import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { STEP_LABELS } from "../constants/questionnaire";
import type { QuestionnaireStepKind, QuestionStatus } from "../constants/questionnaire";
import { cn } from "../utils/cn";
import type { ButtonVariant } from "../utils/class-names";
import type { DataAttributes } from "../utils/data-attributes";
import { dataFlagsOf } from "../utils/data-flags";
import { Button } from "./button";
import type { ButtonProps } from "./button";
import { useQuestionnaire } from "./questionnaire-context";
import type { QuestionnaireState } from "./questionnaire-context";

export interface QuestionnaireStepProps extends ButtonProps {
	readonly kind: QuestionnaireStepKind;
}

type StepAttributes = Pick<ButtonHTMLAttributes<HTMLButtonElement>, "hidden" | "inert" | "aria-keyshortcuts"> &
	DataAttributes;

export function QuestionnaireStep(props: QuestionnaireStepProps): ReactElement {
	const { kind, variant, onClick, children, className, ...rest } = props;
	const root = useQuestionnaire();
	return (
		<Button
			data-slot={`questionnaire-${kind}`}
			{...stepAttributesOf(kind, root, rest.disabled)}
			variant={variant ?? stepVariantOf(kind)}
			{...rest}
			type={kind === "submit" ? "submit" : "button"}
			className={cn("wg-kit-quiz-step", className)}
			onClick={stepPressHandlerOf(root, kind, onClick)}
		>
			{children ?? STEP_LABELS[kind]}
		</Button>
	);
}

function stepAttributesOf(
	kind: QuestionnaireStepKind,
	root: QuestionnaireState,
	isDisabled: boolean | undefined,
): StepAttributes {
	const isVisible = isStepVisible(kind, root);
	const shortcut = stepShortcutOf(kind, isVisible && !isDisabled);
	return {
		...dataFlagsOf({ visible: isVisible, hidden: !isVisible }),
		"data-shortcut": shortcut,
		"data-status": activeStatusOf(root),
		"aria-keyshortcuts": shortcut,
		hidden: !isVisible,
		inert: !isVisible,
	};
}

function isLeadingStep(kind: QuestionnaireStepKind): boolean {
	return kind === "next" || kind === "submit";
}

function stepShortcutOf(kind: QuestionnaireStepKind, isPressable: boolean): "Enter" | undefined {
	if (!isPressable || !isLeadingStep(kind)) return undefined;
	return "Enter";
}

function stepVariantOf(kind: QuestionnaireStepKind): ButtonVariant {
	if (isLeadingStep(kind)) return "default";
	return "ghost";
}

function activeStatusOf(root: QuestionnaireState): QuestionStatus | undefined {
	if (root.active === undefined) return undefined;
	return root.statusOf(root.active);
}

function stepPressHandlerOf(
	root: QuestionnaireState,
	kind: QuestionnaireStepKind,
	onClick: ButtonProps["onClick"],
): ButtonProps["onClick"] {
	return (event) => {
		onClick?.(event);
		if (event.defaultPrevented || kind === "submit") return;
		root[kind]();
	};
}

function isStepVisible(kind: QuestionnaireStepKind, { isActiveSkippable, position }: QuestionnaireState): boolean {
	if (kind === "previous") return !position.first;
	if (kind === "skip") return isActiveSkippable;
	if (kind === "next") return !position.last;
	return position.last;
}
