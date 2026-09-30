import type { FunctionComponent } from "react";
import { cn, createSlotPart } from "@widgetarium/kit";
import type { SlotPartProps } from "@widgetarium/kit";

export type DialogPartProps = SlotPartProps;

export const DialogHeader = part("div", "wg-dialog-head", "DialogHeader");
export const DialogTitle = part("h2", "wg-dialog-title", "DialogTitle");
export const DialogDescription = part("p", "wg-dialog-desc", "DialogDescription");
export const DialogFooter = part("div", "wg-dialog-foot", "DialogFooter");

function part(tag: "div" | "h2" | "p", baseClass: string, name: string): FunctionComponent<DialogPartProps> {
	return createSlotPart(tag, (props) => cn(baseClass, props.className), name);
}
