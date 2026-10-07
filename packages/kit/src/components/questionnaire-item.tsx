import { createElement as h, useId, useRef } from "react";
import type { FieldsetHTMLAttributes, ReactElement } from "react";
import type { QuestionStatus } from "../constants/questionnaire";
import { useRegisteredItem } from "../hooks/use-registered-item";
import { useStatusTold } from "../hooks/use-status-told";
import { cn } from "../utils/cn";
import { QuestionnaireItemContext, useQuestionnaire } from "./questionnaire-context";

export interface QuestionnaireItemProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "name"> {
	readonly name: string;
	readonly required?: boolean | undefined;
	readonly multiple?: boolean | undefined;
	readonly invalid?: boolean | undefined;
	readonly onStatusChange?: ((status: QuestionStatus) => void) | undefined;
}

export function QuestionnaireItem({
	name,
	required = false,
	multiple = false,
	disabled = false,
	invalid = false,
	onStatusChange,
	className,
	...rest
}: QuestionnaireItemProps): ReactElement {
	const root = useQuestionnaire();
	const fieldset = useRef<HTMLFieldSetElement>(null);
	const id = useId();
	const ids = { title: `${id}-title`, description: `${id}-description`, error: `${id}-error` };
	useRegisteredItem(root.register, fieldset, { name, required, multiple, disabled, invalid });
	const status = root.statusOf(name);
	useStatusTold(root.isRead(name) ? status : null, onStatusChange);
	const isActive = root.active === name;
	const isInvalid = invalid || root.isFlagged(name);
	const item = { name, multiple, required, isInvalid, reading: root.readingOf(name), shortcuts: root.shortcuts, ids };
	return (
		<QuestionnaireItemContext.Provider value={item}>
			<fieldset
				ref={fieldset}
				tabIndex={-1}
				disabled={disabled}
				hidden={!isActive}
				inert={!isActive}
				aria-describedby={isInvalid ? `${ids.description} ${ids.error}` : ids.description}
				data-slot="questionnaire-item"
				data-active={isActive ? "" : undefined}
				data-status={status}
				data-required={required ? "" : undefined}
				data-multiple={multiple ? "" : undefined}
				data-disabled={disabled ? "" : undefined}
				data-invalid={isInvalid ? "" : undefined}
				{...rest}
				className={cn("wg-kit-quiz-item", className)}
			/>
		</QuestionnaireItemContext.Provider>
	);
}
