import { createElement as h, useId, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEventHandler, ReactElement, ReactNode } from "react";
import { CHOICE_INPUT_ATTRIBUTE } from "../constants/questionnaire";
import { cn } from "../utils/cn";
import { choiceInputsOf, shortcutOf } from "../utils/questionnaire";
import { Card } from "./card";
import { useQuestionnaireItem } from "./questionnaire-context";

export interface QuestionnaireChoiceProps {
	readonly value: string;
	readonly checked?: boolean | undefined;
	readonly defaultChecked?: boolean | undefined;
	readonly disabled?: boolean | undefined;
	readonly onChange?: ChangeEventHandler<HTMLInputElement> | undefined;
	readonly description?: ReactNode;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function QuestionnaireChoice({
	value,
	disabled = false,
	description,
	className,
	children,
	...answer
}: QuestionnaireChoiceProps): ReactElement {
	const item = useQuestionnaireItem();
	const input = useRef<HTMLInputElement>(null);
	const shortcut = shortcutOf(useShortcutIndex(input), item.shortcuts);
	const descriptionId = useId();
	const isChecked = item.reading.picked.includes(value);
	const type = item.multiple ? "checkbox" : "radio";
	return (
		<Card
			asChild
			tone={isChecked ? "accent" : undefined}
			data-slot="questionnaire-choice"
			data-type={type}
			data-checked={isChecked ? "" : undefined}
			data-unchecked={isChecked ? undefined : ""}
			data-disabled={disabled ? "" : undefined}
			data-invalid={item.isInvalid ? "" : undefined}
			data-shortcut={shortcut ?? undefined}
			className={cn("wg-kit-quiz-choice", className)}
		>
			<label>
				<input
					ref={input}
					{...{ [CHOICE_INPUT_ATTRIBUTE]: "" }}
					{...answer}
					type={type}
					name={item.name}
					value={value}
					disabled={disabled}
					aria-invalid={item.isInvalid || undefined}
					aria-keyshortcuts={shortcut ?? undefined}
					aria-describedby={description ? descriptionId : undefined}
					className="wg-kit-quiz-choice-input"
				/>
				<span className="wg-kit-quiz-choice-mark" aria-hidden="true" />
				<span className="wg-kit-quiz-choice-text">
					<span className="wg-kit-quiz-choice-label">{children}</span>
					{description ? (
						<span id={descriptionId} className="wg-kit-quiz-choice-description">
							{description}
						</span>
					) : null}
				</span>
				{shortcut ? (
					<kbd className="wg-kit-quiz-choice-key" aria-hidden="true">
						{shortcut}
					</kbd>
				) : null}
			</label>
		</Card>
	);
}

function useShortcutIndex(input: { readonly current: HTMLInputElement | null }): number {
	const [index, setIndex] = useState(-1);
	useLayoutEffect(() => {
		const node = input.current;
		const fieldset = node?.closest("fieldset");
		setIndex(node && fieldset ? choiceInputsOf(fieldset).indexOf(node) : -1);
	});
	return index;
}
