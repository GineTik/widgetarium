import { useId } from "react";
import type { RefObject } from "react";
import type { QuestionStatus } from "../constants/questionnaire";
import { useQuestionnaire } from "../components/questionnaire-context";
import type { QuestionnaireItemState, QuestionnaireState } from "../components/questionnaire-context";
import { dataFlagsOf } from "../utils/data-flags";
import type { DataAttributes } from "../utils/data-attributes";
import { useRegisteredItem } from "./use-registered-item";
import type { ItemFacts } from "./use-registered-item";
import { useStatusTold } from "./use-status-told";

export interface QuestionnaireItemAsk {
	readonly name: string;
	readonly required?: boolean | undefined;
	readonly multiple?: boolean | undefined;
	readonly disabled?: boolean | undefined;
	readonly invalid?: boolean | undefined;
	readonly onStatusChange?: ((status: QuestionStatus) => void) | undefined;
}

export interface QuestionnaireItemView {
	readonly item: QuestionnaireItemState;
	readonly status: QuestionStatus;
	readonly isActive: boolean;
	readonly flags: DataAttributes;
}

export function useQuestionnaireItemState(
	fieldset: RefObject<HTMLFieldSetElement | null>,
	ask: QuestionnaireItemAsk,
): QuestionnaireItemView {
	const root = useQuestionnaire();
	const facts = itemFactsOf(ask);
	const ids = itemIdsOf(useId());
	useRegisteredItem(root.register, fieldset, facts);
	const status = root.statusOf(facts.name);
	useStatusTold(root.isRead(facts.name) ? status : null, ask.onStatusChange);
	const isActive = root.active === facts.name;
	const item = itemStateOf(root, facts, ids);
	return { item, status, isActive, flags: itemFlagsOf(facts, isActive, item.isInvalid) };
}

function itemStateOf(
	root: QuestionnaireState,
	facts: ItemFacts,
	ids: QuestionnaireItemState["ids"],
): QuestionnaireItemState {
	const { name, multiple, required } = facts;
	const isInvalid = facts.invalid || root.isFlagged(name);
	return { name, multiple, required, isInvalid, reading: root.readingOf(name), shortcuts: root.shortcuts, ids };
}

function itemFlagsOf(
	{ required, multiple, disabled }: ItemFacts,
	isActive: boolean,
	isInvalid: boolean,
): DataAttributes {
	return dataFlagsOf({ active: isActive, required, multiple, disabled, invalid: isInvalid });
}

function itemFactsOf({
	name,
	required = false,
	multiple = false,
	disabled = false,
	invalid = false,
}: QuestionnaireItemAsk): ItemFacts {
	return { name, required, multiple, disabled, invalid };
}

function itemIdsOf(id: string): QuestionnaireItemState["ids"] {
	return { title: `${id}-title`, description: `${id}-description`, error: `${id}-error` };
}
