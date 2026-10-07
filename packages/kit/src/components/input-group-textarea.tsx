import { createElement as h } from "react";
import type { ReactElement, Ref, TextareaHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface InputGroupTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly ref?: Ref<HTMLTextAreaElement>;
}

export function InputGroupTextarea({ onValueChange, className, ...rest }: InputGroupTextareaProps): ReactElement {
	return (
		<textarea
			data-slot="input-group-control"
			{...rest}
			className={cn("wg-kit-input-group-control", "is-area", className)}
			onInput={(event) => {
				rest.onInput?.(event);
				onValueChange?.(event.currentTarget.value);
			}}
		/>
	);
}
