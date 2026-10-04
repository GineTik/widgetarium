import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FormFieldControlProps } from "./form-field-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

export function FormFieldChoice({ field, value, onValue }: FormFieldControlProps): ReactElement {
	return (
		<Select value={value} onValueChange={(picked) => onValue(String(picked))}>
			<SelectTrigger>
				<SelectValue placeholder={field.label} />
			</SelectTrigger>
			<SelectContent>
				{(field.options ?? []).map((option) => (
					<SelectItem key={option} value={option}>
						{option}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
