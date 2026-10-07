import { createElement as h, useId } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import type { FormDraft, FormFieldSpec } from "../utils/form-fields";
import type { FormErrors } from "../utils/form-state";
import { Field } from "./field";
import { FieldError } from "./field-error";
import { FieldGroup, FieldLabel } from "./field-parts";
import { FormFieldControl } from "./form-field-control";

export interface FormFieldsProps {
	readonly fields: readonly FormFieldSpec[];
	readonly draft: FormDraft;
	readonly onChange: (name: string, value: string) => void;
	readonly errors?: FormErrors | undefined;
	readonly className?: string | undefined;
}

export function FormFields({ fields, draft, onChange, errors, className: cls }: FormFieldsProps): ReactElement {
	const formId = useId();
	return (
		<FieldGroup className={cn("wg-kit-form", cls)}>
			{fields.map((field) => {
				const error = errors?.[field.name];
				return (
					<Field key={field.name} data-invalid={error ? "true" : undefined}>
						<FieldLabel htmlFor={`${formId}-${field.name}`}>{field.label}</FieldLabel>
						<FormFieldControl
							id={`${formId}-${field.name}`}
							field={field}
							value={draft[field.name] ?? ""}
							isInvalid={error !== undefined}
							onValue={(value) => onChange(field.name, value)}
						/>
						{error ? <FieldError errors={[error]} /> : null}
					</Field>
				);
			})}
		</FieldGroup>
	);
}
