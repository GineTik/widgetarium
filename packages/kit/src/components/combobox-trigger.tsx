import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { Button } from "./button";
import type { ButtonProps } from "./button";
import { useCombobox } from "./combobox-context";

export function ComboboxTrigger({ className, ...rest }: ButtonProps): ReactElement {
	const combobox = useCombobox();
	return (
		<Button
			data-slot="combobox-trigger"
			aria-haspopup="listbox"
			aria-expanded={combobox.isOpen}
			aria-controls={combobox.listId}
			disabled={combobox.disabled}
			{...rest}
			className={cn("wg-kit-combobox-trigger", className)}
			onClick={(event) => {
				rest.onClick?.(event);
				if (!event.defaultPrevented) combobox.setOpen(!combobox.isOpen);
			}}
		/>
	);
}
