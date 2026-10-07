import type { FunctionComponent } from "react";
import { cn } from "../utils/cn";
import { classedSlotPart, createSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import type { LabelProps } from "./label";

export const FieldLabel: FunctionComponent<LabelProps> = createSlotPart<LabelProps>(
	"label",
	(props) => cn("wg-kit-form-label", props.className),
	"FieldLabel",
);

export const FieldDescription: FunctionComponent<SlotPartProps> = classedSlotPart(
	"p",
	"wg-kit-form-description",
	"FieldDescription",
);

export const FieldGroup: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-form-group", "FieldGroup");

export const FieldContent: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-form-content",
	"FieldContent",
);

export const FieldTitle: FunctionComponent<SlotPartProps> = classedSlotPart("div", "wg-kit-form-title", "FieldTitle");

export const FieldSet: FunctionComponent<SlotPartProps> = classedSlotPart("fieldset", "wg-kit-form-set", "FieldSet");
