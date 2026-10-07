import { createElement as h } from "react";
import type { InputHTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../utils/cn";

export interface InputGroupInputProps extends InputHTMLAttributes<HTMLInputElement> {
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly ref?: Ref<HTMLInputElement>;
}

export function InputGroupInput({ onValueChange, className, ...rest }: InputGroupInputProps): ReactElement {
	return (
		<input
			data-slot="input-group-control"
			{...rest}
			className={cn("wg-kit-input-group-control", className)}
			onInput={(event) => {
				rest.onInput?.(event);
				onValueChange?.(event.currentTarget.value);
			}}
		/>
	);
}
