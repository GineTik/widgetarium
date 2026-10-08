import { createContext, useContext } from "react";
import type { Context } from "react";
import type { QuestionStatus, ShortcutKind } from "../constants/questionnaire";
import type { ItemReading } from "../utils/questionnaire";

export interface QuestionnaireEntry {
	readonly name: string;
	readonly required: boolean;
	readonly multiple: boolean;
	readonly disabled: boolean;
	readonly invalid: boolean;
	readonly element: HTMLFieldSetElement;
}

export interface QuestionnairePosition {
	readonly current: number;
	readonly total: number;
	readonly first: boolean;
	readonly last: boolean;
}

export interface QuestionnaireState {
	readonly active: string | undefined;
	readonly isActiveSkippable: boolean;
	readonly position: QuestionnairePosition;
	readonly shortcuts: ShortcutKind | undefined;
	readonly statusOf: (name: string) => QuestionStatus;
	readonly readingOf: (name: string) => ItemReading;
	readonly isRead: (name: string) => boolean;
	readonly isFlagged: (name: string) => boolean;
	readonly register: (entry: QuestionnaireEntry) => () => void;
	readonly previous: () => void;
	readonly next: () => void;
	readonly skip: () => void;
}

export interface QuestionnaireItemState {
	readonly name: string;
	readonly multiple: boolean;
	readonly required: boolean;
	readonly isInvalid: boolean;
	readonly reading: ItemReading;
	readonly shortcuts: ShortcutKind | undefined;
	readonly ids: { readonly title: string; readonly description: string; readonly error: string };
}

export const QuestionnaireContext: Context<QuestionnaireState | null> = createContext<QuestionnaireState | null>(null);

export const QuestionnaireItemContext: Context<QuestionnaireItemState | null> =
	createContext<QuestionnaireItemState | null>(null);

export function useQuestionnaire(): QuestionnaireState {
	const state = useContext(QuestionnaireContext);
	if (!state) throw new Error("a questionnaire part stands outside Questionnaire");
	return state;
}

export function useQuestionnaireItem(): QuestionnaireItemState {
	const state = useContext(QuestionnaireItemContext);
	if (!state) throw new Error("a questionnaire answer stands outside QuestionnaireItem");
	return state;
}
