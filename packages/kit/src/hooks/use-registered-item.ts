import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import type { QuestionnaireEntry } from "../components/questionnaire-context";

export type ItemFacts = Omit<QuestionnaireEntry, "element">;

export function useRegisteredItem(
	register: (entry: QuestionnaireEntry) => () => void,
	fieldset: RefObject<HTMLFieldSetElement | null>,
	{ name, required, multiple, disabled, invalid }: ItemFacts,
): void {
	useLayoutEffect(() => {
		const element = fieldset.current;
		return element ? register({ name, required, multiple, disabled, invalid, element }) : undefined;
	}, [register, name, required, multiple, disabled, invalid]);
}
