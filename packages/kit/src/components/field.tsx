import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { fieldClass } from "../utils/class-names";
import { withoutFieldLook } from "../utils/field-look";

export function Field({ icon, value, onInput, placeholder, type = "text", ...rest }: LooseProps) {
	return (
		<label className={fieldClass(rest)}>
			{icon}
			<input
				{...withoutFieldLook(rest)}
				className="wg-kit-field-input"
				type={type}
				value={value}
				placeholder={placeholder}
				onInput={onInput}
			/>
		</label>
	);
}
