import { useRef } from "react";
import type { FormEvent, RefObject } from "react";
import type { ShortcutKind } from "../constants/questionnaire";
import type {
	QuestionnaireEntry,
	QuestionnairePosition,
	QuestionnaireState,
} from "../components/questionnaire-context";
import { isSkippable, neighbourOf } from "../utils/questionnaire";
import { useActiveItem } from "./use-active-item";
import { focusIn } from "./use-focus-on-move";
import { useQuestionnaireAnswers } from "./use-questionnaire-answers";
import type { QuestionnaireAnswers } from "./use-questionnaire-answers";
import { useQuestionnaireMoves } from "./use-questionnaire-moves";
import type { Moves } from "./use-questionnaire-moves";

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

export function useQuestionnaireMachine(ask: QuestionnaireAsk): QuestionnaireMachine {
	const form = useRef<HTMLFormElement>(null);
	const answers = useQuestionnaireAnswers();
	const order = orderOf(answers.entries, ask.items);
	const [active, choose] = useActiveItem(ask, order);
	const moves = useQuestionnaireMoves({ answers, order, active, form, choose });
	return machineOf(moves, ask.shortcuts);
}

function machineOf(moves: Moves, shortcuts: ShortcutKind | undefined): QuestionnaireMachine {
	return {
		state: stateOf(moves, shortcuts),
		form: moves.form,
		activeElement: () => moves.activeEntry?.element ?? null,
		advanceIfSettled: () => advanceIfSettled(moves),
		reread: moves.answers.reread,
		refuseSubmit: (event) => refuseSubmit(moves, event),
		restart: () => restart(moves),
	};
}

function stateOf(moves: Moves, shortcuts: ShortcutKind | undefined): QuestionnaireState {
	return {
		active: moves.active,
		isActiveSkippable: isSkippable(moves.activeEntry),
		position: positionOf(moves.order, moves.active),
		shortcuts,
		...answerLookupsOf(moves.answers),
		previous: () => movePrevious(moves),
		next: () => advance(moves, advanceVerdictOf(moves.answers, moves.activeEntry)),
		skip: () => moveSkipping(moves),
	};
}

function answerLookupsOf(
	answers: QuestionnaireAnswers,
): Pick<QuestionnaireState, "statusOf" | "readingOf" | "isRead" | "isFlagged" | "register"> {
	return {
		statusOf: answers.statusOf,
		readingOf: answers.readingOf,
		isRead: answers.isRead,
		isFlagged: answers.isFlagged,
		register: answers.register,
	};
}

function positionOf(order: readonly string[], active: string | undefined): QuestionnairePosition {
	const at = active === undefined ? -1 : order.indexOf(active);
	return { current: at + 1, total: order.length, first: at <= 0, last: at === order.length - 1 };
}

function advanceVerdictOf(answers: QuestionnaireAnswers, entry: QuestionnaireEntry | undefined): AdvanceVerdict {
	if (!entry) return "hold";
	if (answers.isSettledEntry(entry)) return "advance";
	return "flag";
}

function advanceIfSettled(moves: Moves): (() => void) | null {
	if (advanceVerdictOf(moves.answers, moves.activeEntry) !== "advance") return null;
	return () => advance(moves, "advance");
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

function restart({ answers, order, choose }: Moves): void {
	answers.forgetAll();
	if (order[0] !== undefined) choose(order[0]);
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
