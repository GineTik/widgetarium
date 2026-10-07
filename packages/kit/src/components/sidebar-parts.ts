import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const SidebarHeader: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-side-header",
	"SidebarHeader",
);

export const SidebarFooter: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-side-footer",
	"SidebarFooter",
);

export const SidebarContent: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-side-content",
	"SidebarContent",
);

export const SidebarGroupLabel: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-side-label",
	"SidebarGroupLabel",
);

export const SidebarGroupContent: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-side-group-content",
	"SidebarGroupContent",
);

export const SidebarMenu: FunctionComponent<SlotPartProps> = classedSlotPart("ul", "wg-kit-side-menu", "SidebarMenu");

export const SidebarMenuItem: FunctionComponent<SlotPartProps> = classedSlotPart(
	"li",
	"wg-kit-side-menu-item",
	"SidebarMenuItem",
);

export const SidebarInset: FunctionComponent<SlotPartProps> = classedSlotPart(
	"main",
	"wg-kit-side-inset",
	"SidebarInset",
);

export const SidebarGroupOfParts: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-side-group",
	"SidebarGroup",
);
