import { createElement as h } from "react";
import type { OptionHTMLAttributes, ReactElement } from "react";

export function NativeSelectOption(props: OptionHTMLAttributes<HTMLOptionElement>): ReactElement {
	return <option data-slot="native-select-option" {...props} />;
}
