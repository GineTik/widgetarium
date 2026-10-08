import type { RefObject } from "react";
import type { QuestionnaireEntry } from "../components/questionnaire-context";
import { useFocusOnMove } from "./use-focus-on-move";
import type { FocusMode } from "./use-focus-on-move";
import type { QuestionnaireAnswers } from "./use-questionnaire-answers";

export interface Choice {
	readonly answers: QuestionnaireAnswers;
	readonly order: readonly string[];
	readonly active: string | undefined;
	readonly form: RefObject<HTMLFormElement | null>;
	readonly choose: (name: string) => void;
}

export interface Moves extends Choice {
	readonly activeEntry: QuestionnaireEntry | undefined;
	readonly goTo: (name: string, mode: FocusMode) => void;
}

export function useQuestionnaireMoves(choice: Choice): Moves {
	const entryOf = (name: string | undefined): QuestionnaireEntry | undefined =>
		choice.answers.entries.find((entry) => entry.name === name);
	const focusAfter = useFocusOnMove(choice.active, (name) => entryOf(name)?.element ?? null);
	const goTo = (name: string, mode: FocusMode): void => {
		focusAfter(mode);
		choice.choose(name);
	};
	return { ...choice, activeEntry: entryOf(choice.active), goTo };
}
