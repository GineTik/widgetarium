import { createElement as h, useRef } from "react";
import type { FieldsetHTMLAttributes, ReactElement } from "react";
import type { QuestionStatus } from "../constants/questionnaire";
import { useQuestionnaireItemState } from "../hooks/use-questionnaire-item-state";
import { cn } from "../utils/cn";
import { QuestionnaireItemContext } from "./questionnaire-context";
import type { QuestionnaireItemState } from "./questionnaire-context";

export interface QuestionnaireItemProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "name"> {
	readonly name: string;
	readonly required?: boolean | undefined;
	readonly multiple?: boolean | undefined;
	readonly invalid?: boolean | undefined;
	readonly onStatusChange?: ((status: QuestionStatus) => void) | undefined;
}

export function QuestionnaireItem(props: QuestionnaireItemProps): ReactElement {
	const { name, required, multiple, disabled = false, invalid, onStatusChange, className, ...rest } = props;
	const fieldset = useRef<HTMLFieldSetElement>(null);
	const { item, status, isActive, flags } = useQuestionnaireItemState(fieldset, props);
	return (
		<QuestionnaireItemContext.Provider value={item}>
			<fieldset
				ref={fieldset}
				tabIndex={-1}
				disabled={disabled}
				hidden={!isActive}
				inert={!isActive}
				aria-describedby={describedByOf(item)}
				data-slot="questionnaire-item"
				data-status={status}
				{...flags}
				{...rest}
				className={cn("wg-kit-quiz-item", className)}
			/>
		</QuestionnaireItemContext.Provider>
	);
}

function describedByOf({ ids, isInvalid }: QuestionnaireItemState): string {
	if (isInvalid) return `${ids.description} ${ids.error}`;
	return ids.description;
}
