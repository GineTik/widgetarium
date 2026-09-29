import { cn, createSlotPart } from "@widgetarium/kit";

export const DialogHeader = part("div", "wg-dialog-head", "DialogHeader");
export const DialogTitle = part("h2", "wg-dialog-title", "DialogTitle");
export const DialogDescription = part("p", "wg-dialog-desc", "DialogDescription");
export const DialogFooter = part("div", "wg-dialog-foot", "DialogFooter");

function part(tag, baseClass, name) {
	return createSlotPart(tag, (props) => cn(baseClass, props.className), name);
}
