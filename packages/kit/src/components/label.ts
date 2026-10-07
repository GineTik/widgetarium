import type { FunctionComponent } from "react";
import { cn } from "../utils/cn";
import { createSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export interface LabelProps extends SlotPartProps {
	readonly htmlFor?: string | undefined;
}

export const Label: FunctionComponent<LabelProps> = createSlotPart<LabelProps>(
	"label",
	(props) => cn("wg-kit-label", props.className),
	"Label",
);
