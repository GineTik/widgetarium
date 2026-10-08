import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Controller,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	Input,
	InputGroup,
	InputGroupAddon,
	InputGroupText,
	InputGroupTextarea,
	useForm,
} from "../../index";
import { BUG_SCHEMA } from "./bug-schema";

export function InputsBugReport(): ReactElement {
	const form = useForm({ schema: BUG_SCHEMA, defaultValues: { title: "", description: "" } });
	const [sent, setSent] = useState("");
	return (
		<Card>
			<CardHeader>
				<CardTitle>Bug Report</CardTitle>
				<CardDescription>Help us improve by reporting bugs you encounter.</CardDescription>
			</CardHeader>
			<CardContent>
				<form id="form-bug-report" onSubmit={form.handleSubmit((data) => setSent(JSON.stringify(data)))}>
					<FieldGroup>
						<Controller
							name="title"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="form-bug-title">Bug Title</FieldLabel>
									<Input
										{...field}
										id="form-bug-title"
										aria-invalid={fieldState.invalid}
										placeholder="Login button not working on mobile"
										autoComplete="off"
									/>
									{fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
								</Field>
							)}
						/>
						<Controller
							name="description"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="form-bug-description">Description</FieldLabel>
									<InputGroup>
										<InputGroupTextarea
											{...field}
											id="form-bug-description"
											rows={6}
											aria-invalid={fieldState.invalid}
											placeholder="I'm having an issue with the login button on mobile."
										/>
										<InputGroupAddon align="block-end">
											<InputGroupText>{`${field.value.length}/100 characters`}</InputGroupText>
										</InputGroupAddon>
									</InputGroup>
									<FieldDescription>
										Include steps to reproduce, expected behavior, and what actually happened.
									</FieldDescription>
									{fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
								</Field>
							)}
						/>
					</FieldGroup>
				</form>
				{sent ? <p className="wg-showcase-note">{`Sent: ${sent}`}</p> : null}
			</CardContent>
			<CardFooter>
				<Button type="button" variant="outline" onClick={() => form.reset()}>
					Reset
				</Button>
				<Button type="submit" variant="default" form="form-bug-report">
					Submit
				</Button>
			</CardFooter>
		</Card>
	);
}
