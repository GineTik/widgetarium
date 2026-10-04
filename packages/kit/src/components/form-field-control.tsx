import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FormFieldSpec } from "../utils/form-fields";
import { Field } from "./field";
import { FormFieldChoice } from "./form-field-choice";
import { TextArea } from "./text-area";

export interface FormFieldControlProps {
	readonly field: FormFieldSpec;
	readonly value: string;
	readonly onValue: (value: string) => void;
}

export function FormFieldControl({ field, value, onValue }: FormFieldControlProps): ReactElement {
	if (field.kind === "text" || field.kind === "lines")
		return <TextArea block rows={3} value={value} onChange={(event) => onValue(event.target.value)} />;
	if (field.kind === "choice") return <FormFieldChoice field={field} value={value} onValue={onValue} />;
	const type = field.kind === "number" ? "number" : "text";
	return <Field block type={type} value={value} required={field.isRequired} onValueChange={onValue} />;
}
