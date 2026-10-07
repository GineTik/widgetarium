import { createElement as h } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactElement } from "react";
import { useDialog } from "./dialog-context";
import { Slot } from "./slot";

export interface DialogTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly asChild?: boolean;
}

export function DialogTrigger({ asChild = false, onClick, ...rest }: DialogTriggerProps): ReactElement {
	const { isOpen, setOpen } = useDialog();
	return h(asChild ? Slot : "button", {
		type: asChild ? undefined : "button",
		"data-slot": "dialog-trigger",
		"aria-haspopup": "dialog",
		"aria-expanded": isOpen,
		"data-state": isOpen ? "open" : "closed",
		...rest,
		onClick: (event: MouseEvent<HTMLButtonElement>) => {
			onClick?.(event);
			if (!event.defaultPrevented) setOpen(true);
		},
	});
}
