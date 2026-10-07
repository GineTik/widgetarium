import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Button } from "./button";
import type { ButtonProps } from "./button";
import { useDialog } from "./dialog-context";
import { Slot } from "./slot";

export type DialogCloseProps = ButtonProps;

export function DialogClose({ asChild = false, onClick, ...rest }: DialogCloseProps): ReactElement {
	const { setOpen } = useDialog();
	return h(asChild ? Slot : Button, {
		"data-slot": "dialog-close",
		...rest,
		onClick: (event: MouseEvent<HTMLButtonElement>) => {
			onClick?.(event);
			if (!event.defaultPrevented) setOpen(false);
		},
	});
}
