import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const InputOTPGroup: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-otp-group",
	"InputOTPGroup",
);
