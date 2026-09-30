import { createElement as h } from "react";
import type { ReactElement, TextareaHTMLAttributes } from "react";
import { fieldClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import type { FieldLook } from "./field";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldLook {}

const AREA_ROWS = 4;

export function TextArea({
	value,
	onInput,
	placeholder,
	size,
	block,
	className,
	...behaviour
}: TextAreaProps): ReactElement {
	return (
		<label className={cn(fieldClass({ size, block, className }), "is-area")}>
			<textarea
				{...behaviour}
				className="wg-kit-field-area"
				rows={AREA_ROWS}
				value={value}
				placeholder={placeholder}
				onInput={onInput}
			/>
		</label>
	);
}
