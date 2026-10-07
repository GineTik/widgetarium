import { useCallback, useState } from "react";
import type { QuestionStatus } from "../constants/questionnaire";
import type { QuestionnaireEntry } from "../components/questionnaire-context";
import {
	choiceInputsOf,
	isAnswered,
	isChoice,
	isInput,
	isSettled,
	NOTHING_READ,
	readingOf,
	statusOf,
	textInputsOf,
} from "../utils/questionnaire";
import type { ItemReading } from "../utils/questionnaire";

export interface QuestionnaireAnswers {
	readonly entries: readonly QuestionnaireEntry[];
	readonly statusOf: (name: string) => QuestionStatus;
	readonly readingOf: (name: string) => ItemReading;
	readonly isRead: (name: string) => boolean;
	readonly isFlagged: (name: string) => boolean;
	readonly isSettledEntry: (entry: QuestionnaireEntry) => boolean;
	readonly register: (entry: QuestionnaireEntry) => () => void;
	readonly reread: (target: EventTarget | null) => void;
	readonly skip: (entry: QuestionnaireEntry) => void;
	readonly flag: (names: readonly string[]) => void;
	readonly forgetAll: () => void;
}

const NONE: ReadonlySet<string> = new Set();

export function useQuestionnaireAnswers(): QuestionnaireAnswers {
	const [entries, setEntries] = useState<readonly QuestionnaireEntry[]>([]);
	const [readings, setReadings] = useState<Readonly<Record<string, ItemReading>>>({});
	const [skipped, setSkipped] = useState<ReadonlySet<string>>(NONE);
	const [flagged, setFlagged] = useState<ReadonlySet<string>>(NONE);
	const register = useCallback((entry: QuestionnaireEntry) => {
		setEntries((was) => inDocumentOrder([...was.filter((held) => held.name !== entry.name), entry]));
		setReadings((was) => ({ ...was, [entry.name]: readingOf(entry.element) }));
		return () => setEntries((was) => was.filter((held) => held !== entry));
	}, []);
	const keep = (name: string, reading: ItemReading): void => {
		setReadings((was) => ({ ...was, [name]: reading }));
		setSkipped((was) => without(was, name));
		setFlagged((was) => without(was, name));
	};
	const status = (name: string): QuestionStatus => statusOf(readings[name] ?? NOTHING_READ, skipped.has(name));
	return {
		entries,
		statusOf: status,
		readingOf: (name) => readings[name] ?? NOTHING_READ,
		isRead: (name) => Object.hasOwn(readings, name),
		isFlagged: (name) => flagged.has(name),
		isSettledEntry: (entry) => isSettled({ status: status(entry.name), ...entry }),
		register,
		reread: (target) => {
			const entry = entryHolding(entries, target);
			if (!entry || !isInput(target)) return;
			if (!entry.multiple) clearOtherAnswer(entry.element, target);
			const reading = readingOf(entry.element);
			if (isAnswered(reading)) keep(entry.name, reading);
			else setReadings((was) => ({ ...was, [entry.name]: reading }));
		},
		skip: (entry) => {
			clearAnswers(entry.element);
			keep(entry.name, NOTHING_READ);
			setSkipped((was) => new Set([...was, entry.name]));
		},
		flag: (names) => setFlagged(new Set(names)),
		forgetAll: () => {
			setSkipped(NONE);
			setFlagged(NONE);
			queueMicrotask(() =>
				setReadings(Object.fromEntries(entries.map((entry) => [entry.name, readingOf(entry.element)]))),
			);
		},
	};
}

function entryHolding(entries: readonly QuestionnaireEntry[], target: EventTarget | null): QuestionnaireEntry | null {
	if (!(target instanceof Node)) return null;
	return entries.find((entry) => entry.element.contains(target)) ?? null;
}

function clearOtherAnswer(fieldset: Element, changed: HTMLInputElement): void {
	if (isChoice(changed)) {
		if (changed.checked) for (const text of textInputsOf(fieldset)) text.value = "";
		return;
	}
	if (changed.value.trim() !== "") for (const choice of choiceInputsOf(fieldset)) choice.checked = false;
}

function clearAnswers(fieldset: Element): void {
	for (const choice of choiceInputsOf(fieldset)) choice.checked = false;
	for (const text of textInputsOf(fieldset)) text.value = "";
}

function inDocumentOrder(entries: readonly QuestionnaireEntry[]): readonly QuestionnaireEntry[] {
	return [...entries].sort((a, b) =>
		a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
	);
}

function without(names: ReadonlySet<string>, name: string): ReadonlySet<string> {
	if (!names.has(name)) return names;
	const left = new Set(names);
	left.delete(name);
	return left;
}
