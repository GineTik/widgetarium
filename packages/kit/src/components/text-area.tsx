import { createElement as h } from "react";
import type { ReactElement, TextareaHTMLAttributes } from "react";
import { fieldClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import type { InputLook } from "./input";

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, InputLook {}

const AREA_ROWS = 4;

export function TextArea({ size, block, className, rows = AREA_ROWS, ...behaviour }: TextAreaProps): ReactElement {
	return (
		<label className={cn(fieldClass({ size, block, className }), "is-area")}>
			<textarea data-slot="textarea" {...behaviour} className="wg-kit-field-area" rows={rows} />
		</label>
	);
}

export const Textarea = TextArea;
