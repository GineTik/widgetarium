import { createContext, useContext } from "react";
import type { Context } from "react";
import type { PopoverState } from "../hooks/use-popover-state";
import type { ClassNameValue } from "../utils/cn";

export interface HeldPopover extends PopoverState {
	readonly className?: ClassNameValue;
}

export type PopoverDataState = "open" | "closed";

export const PopoverContext: Context<HeldPopover | null> = createContext<HeldPopover | null>(null);

export const POPOVER_ITEM = ".wg-kit-pop-item:not([disabled])";

export function usePopover(): HeldPopover {
	const popover = useContext(PopoverContext);
	if (!popover) throw new Error("a popover part stands outside a Popover");
	return popover;
}

export function dataStateOf(isOpen: boolean): PopoverDataState {
	return isOpen ? "open" : "closed";
}
