import type { FunctionComponent } from "react";
import type { SlotPartProps } from "./create-slot-part";
import { createPressingLabel } from "./pressing-label";

export interface LabelProps extends SlotPartProps {
	readonly htmlFor?: string | undefined;
}

export const Label: FunctionComponent<LabelProps> = createPressingLabel("wg-kit-label", "Label");
