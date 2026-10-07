import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const Kbd: FunctionComponent<SlotPartProps> = classedSlotPart("kbd", "wg-kit-kbd", "Kbd");

export const KbdGroup: FunctionComponent<SlotPartProps> = classedSlotPart("kbd", "wg-kit-kbd-group", "KbdGroup");
