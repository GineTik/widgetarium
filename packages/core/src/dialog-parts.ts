import type { FunctionComponent, HTMLAttributes } from "react";
import { cn, createSlotPart } from "@widgetarium/kit";

export type DialogPartProps = HTMLAttributes<HTMLElement> & { readonly asChild?: boolean };

export const DialogHeader = part("div", "wg-dialog-head", "DialogHeader");
export const DialogTitle = part("h2", "wg-dialog-title", "DialogTitle");
export const DialogDescription = part("p", "wg-dialog-desc", "DialogDescription");
export const DialogFooter = part("div", "wg-dialog-foot", "DialogFooter");

// TODO: createSlotPart and cn take any until the kit types them
function part(tag: "div" | "h2" | "p", baseClass: string, name: string): FunctionComponent<DialogPartProps> {
	return createSlotPart(tag, (props: DialogPartProps) => cn(baseClass, props.className), name);
}
