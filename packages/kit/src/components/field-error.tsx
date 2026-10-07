import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";

export interface FieldErrorProps extends HTMLAttributes<HTMLDivElement> {
	readonly errors?: readonly ({ readonly message?: string | undefined } | undefined)[] | undefined;
}

export function FieldError({ errors, className, children, ...rest }: FieldErrorProps): ReactElement | null {
	const said = children ?? messagesOf(errors);
	if (said === null) return null;
	return (
		<div role="alert" data-slot="field-error" {...rest} className={cn("wg-kit-form-error", className)}>
			{said}
		</div>
	);
}

function messagesOf(errors: FieldErrorProps["errors"]): ReactNode {
	const messages = [...new Set((errors ?? []).map((one) => one?.message).filter((one) => one !== undefined))];
	if (messages.length === 0) return null;
	if (messages.length === 1) return messages[0];
	return (
		<ul className="wg-kit-form-error-list">
			{messages.map((message) => (
				<li key={message}>{message}</li>
			))}
		</ul>
	);
}
