import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FormFieldSpec } from "../utils/form-fields";
import { Input } from "./input";
import { FormFieldChoice } from "./form-field-choice";
import { TextArea } from "./text-area";

export interface FormFieldControlProps {
	readonly id?: string | undefined;
	readonly field: FormFieldSpec;
	readonly value: string;
	readonly isInvalid?: boolean | undefined;
	readonly onValue: (value: string) => void;
}

export function FormFieldControl({ id, field, value, isInvalid, onValue }: FormFieldControlProps): ReactElement {
	if (field.kind === "text" || field.kind === "lines")
		return (
			<TextArea
				block
				rows={3}
				id={id}
				aria-invalid={isInvalid || undefined}
				value={value}
				onChange={(event) => onValue(event.target.value)}
			/>
		);
	if (field.kind === "choice")
		return <FormFieldChoice id={id} field={field} value={value} isInvalid={isInvalid} onValue={onValue} />;
	const type = field.kind === "number" ? "number" : "text";
	return (
		<Input
			block
			id={id}
			aria-invalid={isInvalid || undefined}
			type={type}
			value={value}
			required={field.isRequired}
			onValueChange={onValue}
		/>
	);
}
