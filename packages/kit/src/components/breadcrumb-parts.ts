import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const BreadcrumbItem: FunctionComponent<SlotPartProps> = classedSlotPart(
	"li",
	"wg-kit-breadcrumb-item",
	"BreadcrumbItem",
);
