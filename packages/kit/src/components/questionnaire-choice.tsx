import { createElement as h, useId, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEventHandler, ReactElement, ReactNode } from "react";
import { CHOICE_INPUT_ATTRIBUTE } from "../constants/questionnaire";
import { cn } from "../utils/cn";
import { dataFlagsOf } from "../utils/data-flags";
import { shortcutOf } from "../utils/questionnaire";
import { Card } from "./card";
import { QuestionnaireChoiceKey } from "./questionnaire-choice-key";
import { QuestionnaireChoiceText } from "./questionnaire-choice-text";
import { useQuestionnaireItem } from "./questionnaire-context";
import { choiceInputsOf } from "./questionnaire-fields";

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

export function QuestionnaireChoice(props: QuestionnaireChoiceProps): ReactElement {
	const { value, disabled = false, description, className, children, ...answer } = props;
	const item = useQuestionnaireItem();
	const input = useRef<HTMLInputElement>(null);
	const shortcut = shortcutOf(useShortcutIndex(input), item.shortcuts) ?? undefined;
	const descriptionId = useId();
	const isChecked = item.reading.picked.includes(value);
	const type = item.multiple ? "checkbox" : "radio";
	return (
		<Card
			asChild
			tone={isChecked ? "accent" : undefined}
			data-slot="questionnaire-choice"
			data-type={type}
			{...dataFlagsOf({ checked: isChecked, unchecked: !isChecked, disabled, invalid: item.isInvalid })}
			data-shortcut={shortcut}
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
					aria-keyshortcuts={shortcut}
					aria-describedby={description ? descriptionId : undefined}
					className="wg-kit-quiz-choice-input"
				/>
				<span className="wg-kit-quiz-choice-mark" aria-hidden="true" />
				<QuestionnaireChoiceText descriptionId={descriptionId} description={description}>
					{children}
				</QuestionnaireChoiceText>
				<QuestionnaireChoiceKey shortcut={shortcut} />
			</label>
		</Card>
	);
}

function useShortcutIndex(input: { readonly current: HTMLInputElement | null }): number {
	const [index, setIndex] = useState(-1);
	useLayoutEffect(() => setIndex(choiceIndexOf(input.current)));
	return index;
}

function choiceIndexOf(node: HTMLInputElement | null): number {
	const fieldset = node?.closest("fieldset");
	if (!node || !fieldset) return -1;
	return choiceInputsOf(fieldset).indexOf(node);
}
