import type { FunctionComponent } from "react";
import { buttonClass, iconButtonClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { createSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const PAGE_LOOK = iconButtonClass({ variant: "ghost", size: "s" });

export const STEP_LOOK = buttonClass({ variant: "ghost", size: "s" });

export const STEP_ICON_PX = 16;

export const PaginationContent: FunctionComponent<SlotPartProps> = createSlotPart(
	"ul",
	(props) => cn("wg-kit-pagination-content", props.className),
	"PaginationContent",
);

export const PaginationItem: FunctionComponent<SlotPartProps> = createSlotPart(
	"li",
	(props) => cn("wg-kit-pagination-item", props.className),
	"PaginationItem",
);
