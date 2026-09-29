import { createContext, useContext } from "react";

export const PopoverContext = createContext(null);

export const POPOVER_ITEM = ".wg-kit-pop-item:not([disabled])";

export function usePopover() {
	const popover = useContext(PopoverContext);
	if (!popover) throw new Error("a popover part stands outside a Popover");
	return popover;
}

export function dataStateOf(isOpen: boolean) {
	return isOpen ? "open" : "closed";
}
