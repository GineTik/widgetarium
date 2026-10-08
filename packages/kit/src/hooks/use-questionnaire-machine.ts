import { useRef } from "react";
import type { FormEvent, RefObject } from "react";
import type { ShortcutKind } from "../constants/questionnaire";
import type { QuestionnaireEntry, QuestionnaireState } from "../components/questionnaire-context";
import { isSkippable, neighbourOf } from "../utils/questionnaire";
import { useControllableState } from "./use-controllable-state";
import { focusIn, useFocusOnMove } from "./use-focus-on-move";
import type { FocusMode } from "./use-focus-on-move";
import { useQuestionnaireAnswers } from "./use-questionnaire-answers";
import type { QuestionnaireAnswers } from "./use-questionnaire-answers";

export interface QuestionnaireItemData {
	readonly name: string;
	readonly disabled?: boolean | undefined;
}

export interface QuestionnaireAsk {
	readonly item?: string | undefined;
	readonly defaultItem?: string | undefined;
	readonly items?: readonly QuestionnaireItemData[] | undefined;
	readonly onItemChange?: ((item: string) => void) | undefined;
	readonly shortcuts?: ShortcutKind | undefined;
}

type AdvanceVerdict = "advance" | "flag" | "hold";

export interface QuestionnaireMachine {
	readonly state: QuestionnaireState;
	readonly form: RefObject<HTMLFormElement | null>;
	readonly activeElement: () => HTMLFieldSetElement | null;
	readonly advanceIfSettled: () => (() => void) | null;
	readonly reread: (target: EventTarget | null) => void;
	readonly refuseSubmit: (event: FormEvent<HTMLFormElement>) => boolean;
	readonly restart: () => void;
}

interface Moves {
	readonly answers: QuestionnaireAnswers;
	readonly order: readonly string[];
	readonly active: string | undefined;
	readonly activeEntry: QuestionnaireEntry | undefined;
	readonly form: RefObject<HTMLFormElement | null>;
	readonly goTo: (name: string, mode: FocusMode) => void;
}

export function useQuestionnaireMachine(ask: QuestionnaireAsk): QuestionnaireMachine {
	const form = useRef<HTMLFormElement>(null);
	const answers = useQuestionnaireAnswers();
	const order = orderOf(answers.entries, ask.items);
	const [chosen, choose] = useControllableState<string | undefined>({
		prop: ask.item,
		defaultProp: ask.defaultItem,
		onChange: (next) => next !== undefined && ask.onItemChange?.(next),
	});
	const active = chosen !== undefined && order.includes(chosen) ? chosen : order[0];
	const entryOf = (name: string | undefined): QuestionnaireEntry | undefined =>
		answers.entries.find((entry) => entry.name === name);
	const focusAfter = useFocusOnMove(active, (name) => entryOf(name)?.element ?? null);
	const goTo = (name: string, mode: FocusMode): void => {
		focusAfter(mode);
		choose(name);
	};
	const moves: Moves = { answers, order, active, activeEntry: entryOf(active), form, goTo };
	return {
		state: stateOf(moves, ask.shortcuts),
		form,
		activeElement: () => moves.activeEntry?.element ?? null,
		advanceIfSettled: () =>
			advanceVerdictOf(answers, moves.activeEntry) === "advance" ? () => advance(moves, "advance") : null,
		reread: answers.reread,
		refuseSubmit: (event) => refuseSubmit(moves, event),
		restart: () => {
			answers.forgetAll();
			if (order[0] !== undefined) choose(order[0]);
		},
	};
}

function stateOf(moves: Moves, shortcuts: ShortcutKind | undefined): QuestionnaireState {
	const { answers, order, active } = moves;
	const at = active === undefined ? -1 : order.indexOf(active);
	return {
		active,
		isActiveSkippable: isSkippable(moves.activeEntry),
		position: { current: at + 1, total: order.length, first: at <= 0, last: at === order.length - 1 },
		shortcuts,
		statusOf: answers.statusOf,
		readingOf: answers.readingOf,
		isRead: answers.isRead,
		isFlagged: answers.isFlagged,
		register: answers.register,
		previous: () => movePrevious(moves),
		next: () => advance(moves, advanceVerdictOf(answers, moves.activeEntry)),
		skip: () => moveSkipping(moves),
	};
}

function advanceVerdictOf(answers: QuestionnaireAnswers, entry: QuestionnaireEntry | undefined): AdvanceVerdict {
	if (!entry) return "hold";
	return answers.isSettledEntry(entry) ? "advance" : "flag";
}

function advance({ answers, order, active, activeEntry, form, goTo }: Moves, verdict: AdvanceVerdict): void {
	if (verdict === "flag" && activeEntry) {
		answers.flag([activeEntry.name]);
		focusIn(activeEntry.element, "answer");
		return;
	}
	if (verdict !== "advance") return;
	const after = neighbourOf(order, active, 1);
	if (after === null) form.current?.requestSubmit();
	else goTo(after, "item");
}

function movePrevious({ order, active, goTo }: Moves): void {
	const before = neighbourOf(order, active, -1);
	if (before !== null) goTo(before, "item");
}

function moveSkipping({ answers, order, active, activeEntry, goTo }: Moves): void {
	if (!activeEntry || !isSkippable(activeEntry)) return;
	answers.skip(activeEntry);
	const after = neighbourOf(order, active, 1);
	if (after !== null) goTo(after, "item");
}

function refuseSubmit({ answers, active, goTo }: Moves, event: FormEvent<HTMLFormElement>): boolean {
	const failing = answers.entries.filter((entry) => !entry.disabled && advanceVerdictOf(answers, entry) !== "advance");
	const first = failing[0];
	if (!first) return false;
	event.preventDefault();
	answers.flag(failing.map((entry) => entry.name));
	if (first.name === active) focusIn(first.element, "answer");
	else goTo(first.name, "answer");
	return true;
}

function orderOf(
	entries: readonly QuestionnaireEntry[],
	items: readonly QuestionnaireItemData[] | undefined,
): string[] {
	if (entries.length > 0) return entries.filter((entry) => !entry.disabled).map((entry) => entry.name);
	return (items ?? []).filter((item) => !item.disabled).map((item) => item.name);
}
