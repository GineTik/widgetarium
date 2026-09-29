import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { dataStateOf, usePopover } from "./popover-context";
import { Slot } from "./slot";

export function PopoverTrigger({ asChild = false, onClick, children, ...props }: LooseProps) {
	const popover = usePopover();
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			type={asChild ? undefined : "button"}
			aria-haspopup="dialog"
			aria-expanded={String(popover.isOpen)}
			aria-controls={popover.id}
			data-state={dataStateOf(popover.isOpen)}
			{...props}
			ref={popover.triggerRef}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				popover.openedByKeyboard.current = event.detail === 0;
				popover.setOpen(!popover.isOpen);
			}}
		>
			{children}
		</Comp>
	);
}
