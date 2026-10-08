import type { DataAttributes } from "../utils/data-attributes";
import { dataFlagsOf } from "../utils/data-flags";
import type { QuestionnairePosition } from "./questionnaire-context";

export function positionDataOf(position: QuestionnairePosition): DataAttributes {
	return {
		"data-current": String(position.current),
		"data-total": String(position.total),
		...dataFlagsOf({ first: position.first, last: position.last }),
	};
}
