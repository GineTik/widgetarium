import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Checkbox,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
	Input,
	Textarea,
} from "../../index";

export function ShadcnForm(): ReactElement {
	return (
		<FieldGroup>
			<Field>
				<FieldLabel>Name</FieldLabel>
				<Input placeholder="Ada Lovelace" />
				<FieldDescription>As it appears on the invoice.</FieldDescription>
			</Field>
			<Field data-invalid="true">
				<FieldLabel>Email</FieldLabel>
				<Input placeholder="ada@example.org" />
				<FieldError errors={[{ message: "Enter an email address." }]} />
			</Field>
			<FieldSeparator>or</FieldSeparator>
			<Field orientation="horizontal">
				<Checkbox defaultChecked label="Remember me" />
				<FieldLabel>Remember me</FieldLabel>
			</Field>
			<Field>
				<FieldLabel>Note</FieldLabel>
				<Textarea placeholder="Anything else" />
			</Field>
		</FieldGroup>
	);
}
