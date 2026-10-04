import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import type { FormDraft, FormFieldSpec } from "../utils/form-fields";
import { FormFieldControl } from "./form-field-control";

export interface FormFieldsProps {
	readonly fields: readonly FormFieldSpec[];
	readonly draft: FormDraft;
	readonly onChange: (name: string, value: string) => void;
	readonly className?: string | undefined;
}

export function FormFields({ fields, draft, onChange, className: cls }: FormFieldsProps): ReactElement {
	return (
		<div className={cn("wg-kit-form", cls)}>
			{fields.map((field) => (
				<label key={field.name} className="wg-kit-form-field">
					<span className="wg-kit-form-label">{field.label}</span>
					<FormFieldControl
						field={field}
						value={draft[field.name] ?? ""}
						onValue={(value) => onChange(field.name, value)}
					/>
				</label>
			))}
		</div>
	);
}
