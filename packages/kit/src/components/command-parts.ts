import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const CommandList: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-cmd-list", "CommandList");

export const CommandSeparator: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-cmd-separator",
	"CommandSeparator",
);

export const CommandShortcut: FunctionComponent<SlotPartProps> = classedSlotPart(
	"span",
	"wg-kit-cmd-shortcut",
	"CommandShortcut",
);
