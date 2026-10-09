import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import type { LabelProps } from "./label";
import { createPressingLabel } from "./pressing-label";

export const FieldLabel: FunctionComponent<LabelProps> = createPressingLabel("wg-kit-form-label", "FieldLabel");

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
