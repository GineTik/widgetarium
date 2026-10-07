import type { FunctionComponent } from "react";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";

export const QuestionnaireActions: FunctionComponent<SlotPartProps> = classedSlotPart(
	"div",
	"wg-kit-quiz-actions",
	"QuestionnaireActions",
);
