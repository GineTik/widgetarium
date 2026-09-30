import { createElement as h } from "react";
import type { InputHTMLAttributes, ReactElement, ReactNode } from "react";
import { fieldClass } from "../utils/class-names";
import type { FieldSize } from "../utils/class-names";

export { CodeArea } from "./code-area";
export { MarkdownEditor } from "./markdown-editor";
export { TextArea } from "./text-area";
export type { CodeAreaProps } from "./code-area";
export type { MarkdownEditorProps } from "./markdown-editor";
export type { TextAreaProps } from "./text-area";

export interface FieldLook {
	readonly size?: FieldSize | undefined;
	readonly block?: boolean | undefined;
}

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, FieldLook {
	readonly icon?: ReactNode;
	readonly onValueChange?: ((value: string) => void) | undefined;
}

export function Field({
	icon,
	value,
	onInput,
	onValueChange,
	placeholder,
	type = "text",
	size,
	block,
	className,
	...behaviour
}: FieldProps): ReactElement {
	return (
		<label className={fieldClass({ size, block, className })} data-disabled={behaviour.disabled ? "" : undefined}>
			{icon}
			<input
				{...behaviour}
				className="wg-kit-field-input"
				type={type}
				value={value}
				placeholder={placeholder}
				onInput={(event) => {
					onInput?.(event);
					onValueChange?.(event.currentTarget.value);
				}}
			/>
		</label>
	);
}
