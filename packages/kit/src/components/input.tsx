import { createElement as h } from "react";
import type { InputHTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { fieldClass } from "../utils/class-names";
import type { FieldSize } from "../utils/class-names";

export interface InputLook {
	readonly size?: FieldSize | undefined;
	readonly block?: boolean | undefined;
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, InputLook {
	readonly icon?: ReactNode;
	readonly onValueChange?: ((value: string) => void) | undefined;
	readonly ref?: Ref<HTMLInputElement>;
}

export function Input({
	icon,
	onInput,
	onValueChange,
	type = "text",
	size,
	block,
	className,
	...behaviour
}: InputProps): ReactElement {
	return (
		<label className={fieldClass({ size, block, className })} data-disabled={behaviour.disabled ? "" : undefined}>
			{icon}
			<input
				data-slot="input"
				{...behaviour}
				className="wg-kit-field-input"
				type={type}
				onInput={(event) => {
					onInput?.(event);
					onValueChange?.(event.currentTarget.value);
				}}
			/>
		</label>
	);
}
