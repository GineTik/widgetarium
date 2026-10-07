import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { asCallerItems } from "../utils/combobox";
import { cn } from "../utils/cn";
import { useCombobox } from "./combobox-context";

export interface ComboboxListProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
	readonly children?: ReactNode | ((item: T, index: number) => ReactNode);
}

export function ComboboxList<T = string>({ className, children, ...rest }: ComboboxListProps<T>): ReactElement {
	const combobox = useCombobox();
	const drawn = typeof children === "function" ? asCallerItems<T>(combobox.filtered).map(children) : children;
	return (
		<div
			role="listbox"
			id={combobox.listId}
			aria-multiselectable={combobox.isMultiple || undefined}
			data-slot="combobox-list"
			data-empty={combobox.isEmpty ? "" : undefined}
			{...rest}
			className={cn("wg-kit-combobox-list", className)}
		>
			{drawn}
		</div>
	);
}
