import { createElement as h } from "react";
import type { InputHTMLAttributes, ReactElement } from "react";
import { useComboboxInput } from "../hooks/use-combobox-input";
import { cn } from "../utils/cn";

export function ComboboxChipsInput({
	className,
	...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange">): ReactElement {
	const binding = useComboboxInput();
	return (
		<input
			data-slot="combobox-chip-input"
			{...rest}
			{...binding}
			disabled={binding.disabled || rest.disabled}
			className={cn("wg-kit-combobox-chips-input", className)}
		/>
	);
}
