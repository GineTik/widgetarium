import { createElement as h } from "react";
import type { InputHTMLAttributes, ReactElement } from "react";
import { TEXT_INPUT_ATTRIBUTE } from "../constants/questionnaire";
import { cn } from "../utils/cn";
import { useQuestionnaireItem } from "./questionnaire-context";

export type QuestionnaireInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "name">;

export function QuestionnaireInput({ type = "text", className, ...rest }: QuestionnaireInputProps): ReactElement {
	const item = useQuestionnaireItem();
	const isFilled = item.reading.typed.trim() !== "";
	return (
		<input
			{...{ [TEXT_INPUT_ATTRIBUTE]: "" }}
			data-slot="questionnaire-input"
			data-filled={isFilled ? "" : undefined}
			data-empty={isFilled ? undefined : ""}
			data-disabled={rest.disabled ? "" : undefined}
			data-invalid={item.isInvalid ? "" : undefined}
			aria-invalid={item.isInvalid || undefined}
			{...rest}
			type={type}
			name={isFilled ? item.name : undefined}
			className={cn("wg-kit-quiz-input", className)}
		/>
	);
}
