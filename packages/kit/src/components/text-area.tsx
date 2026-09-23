import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { fieldClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { withoutFieldLook } from "../utils/field-look";

export function TextArea({ value, onInput, placeholder, ...rest }: LooseProps) {
	return (
		<label className={cx(fieldClass(rest), "is-area")}>
			<textarea
				{...withoutFieldLook(rest)}
				className="wg-kit-field-area"
				rows={4}
				value={value}
				placeholder={placeholder}
				onInput={onInput}
			/>
		</label>
	);
}
