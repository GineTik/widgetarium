import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { asCallerItems } from "../utils/combobox";
import { useCombobox } from "./combobox-context";

export interface ComboboxValueProps<T> {
	readonly placeholder?: ReactNode;
	readonly children?: ReactNode | ((value: T[]) => ReactNode);
}

export function ComboboxValue<T = string>({ placeholder, children }: ComboboxValueProps<T>): ReactElement {
	const combobox = useCombobox();
	const shown = combobox.selected.map(combobox.stringOf).join(", ");
	const drawn =
		typeof children === "function"
			? children(asCallerItems<T>(combobox.selected))
			: (children ?? (shown || placeholder));
	return (
		<span data-slot="combobox-value" data-placeholder={shown === "" ? "" : undefined} className="wg-kit-combobox-value">
			{drawn}
		</span>
	);
}
