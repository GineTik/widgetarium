import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { QuestionStatus } from "../constants/questionnaire";
import type { QuestionnaireEntry } from "../components/questionnaire-context";
import {
	choiceInputsOf,
	isChoiceControl,
	isInputTarget,
	readingOf,
	textInputsOf,
} from "../components/questionnaire-fields";
import { isAnswered, isSettled, NOTHING_READ, statusOf } from "../utils/questionnaire";
import type { ItemReading } from "../utils/questionnaire";

interface AnswerReads {
	readonly entries: readonly QuestionnaireEntry[];
	readonly statusOf: (name: string) => QuestionStatus;
	readonly readingOf: (name: string) => ItemReading;
	readonly isRead: (name: string) => boolean;
	readonly isFlagged: (name: string) => boolean;
	readonly isSettledEntry: (entry: QuestionnaireEntry) => boolean;
}

interface AnswerWrites {
	readonly reread: (target: EventTarget | null) => void;
	readonly skip: (entry: QuestionnaireEntry) => void;
	readonly flag: (names: readonly string[]) => void;
	readonly forgetAll: () => void;
}

export interface QuestionnaireAnswers extends AnswerReads, AnswerWrites {
	readonly register: (entry: QuestionnaireEntry) => () => void;
}

type Readings = Readonly<Record<string, ItemReading>>;

type Setter<T> = Dispatch<SetStateAction<T>>;

interface AnswersHeld {
	readonly entries: readonly QuestionnaireEntry[];
	readonly readings: Readings;
	readonly skipped: ReadonlySet<string>;
	readonly flagged: ReadonlySet<string>;
}

interface AnswerWriters {
	readonly setEntries: Setter<readonly QuestionnaireEntry[]>;
	readonly setReadings: Setter<Readings>;
	readonly setSkipped: Setter<ReadonlySet<string>>;
	readonly setFlagged: Setter<ReadonlySet<string>>;
}

const NONE: ReadonlySet<string> = new Set();

export function useQuestionnaireAnswers(): QuestionnaireAnswers {
	const [entries, setEntries] = useState<readonly QuestionnaireEntry[]>([]);
	const [readings, setReadings] = useState<Readings>({});
	const [skipped, setSkipped] = useState<ReadonlySet<string>>(NONE);
	const [flagged, setFlagged] = useState<ReadonlySet<string>>(NONE);
	const writers: AnswerWriters = { setEntries, setReadings, setSkipped, setFlagged };
	const register = useCallback((entry: QuestionnaireEntry) => registerEntry(writers, entry), []);
	return { ...readsOf({ entries, readings, skipped, flagged }), register, ...writesOf(writers, entries) };
}

function readsOf({ entries, readings, skipped, flagged }: AnswersHeld): AnswerReads {
	const status = (name: string): QuestionStatus => statusOf(readings[name] ?? NOTHING_READ, skipped.has(name));
	return {
		entries,
		statusOf: status,
		readingOf: (name) => readings[name] ?? NOTHING_READ,
		isRead: (name) => Object.hasOwn(readings, name),
		isFlagged: (name) => flagged.has(name),
		isSettledEntry: (entry) => isSettled({ status: status(entry.name), ...entry }),
	};
}

function writesOf(writers: AnswerWriters, entries: readonly QuestionnaireEntry[]): AnswerWrites {
	return {
		reread: (target) => rereadTarget(writers, entries, target),
		skip: (entry) => skipEntry(writers, entry),
		flag: (names) => writers.setFlagged(new Set(names)),
		forgetAll: () => forgetAnswers(writers, entries),
	};
}

function registerEntry(writers: AnswerWriters, entry: QuestionnaireEntry): () => void {
	writers.setEntries((was) => withEntry(was, entry));
	writers.setReadings((was) => withReading(was, entry.name, readingOf(entry.element)));
	return () => writers.setEntries((was) => was.filter((held) => held !== entry));
}

function rereadTarget(
	writers: AnswerWriters,
	entries: readonly QuestionnaireEntry[],
	target: EventTarget | null,
): void {
	const entry = entryHolding(entries, target);
	if (!entry || !isInputTarget(target)) return;
	if (!entry.multiple) clearOtherAnswer(entry.element, target);
	const reading = readingOf(entry.element);
	if (isAnswered(reading)) keepAnswer(writers, entry.name, reading);
	else writers.setReadings((was) => withReading(was, entry.name, reading));
}

function skipEntry(writers: AnswerWriters, entry: QuestionnaireEntry): void {
	clearAnswers(entry.element);
	keepAnswer(writers, entry.name, NOTHING_READ);
	writers.setSkipped((was) => new Set([...was, entry.name]));
}

function keepAnswer(writers: AnswerWriters, name: string, reading: ItemReading): void {
	writers.setReadings((was) => withReading(was, name, reading));
	writers.setSkipped((was) => withoutName(was, name));
	writers.setFlagged((was) => withoutName(was, name));
}

function forgetAnswers(writers: AnswerWriters, entries: readonly QuestionnaireEntry[]): void {
	writers.setSkipped(NONE);
	writers.setFlagged(NONE);
	queueMicrotask(() => writers.setReadings(readingsOf(entries)));
}

function readingsOf(entries: readonly QuestionnaireEntry[]): Readings {
	return Object.fromEntries(entries.map((entry) => [entry.name, readingOf(entry.element)]));
}

function withReading(readings: Readings, name: string, reading: ItemReading): Readings {
	return { ...readings, [name]: reading };
}

function withEntry(entries: readonly QuestionnaireEntry[], entry: QuestionnaireEntry): readonly QuestionnaireEntry[] {
	return inDocumentOrder([...entries.filter((held) => held.name !== entry.name), entry]);
}

function entryHolding(entries: readonly QuestionnaireEntry[], target: EventTarget | null): QuestionnaireEntry | null {
	if (!(target instanceof Node)) return null;
	return entries.find((entry) => entry.element.contains(target)) ?? null;
}

function clearOtherAnswer(fieldset: Element, changed: HTMLInputElement): void {
	if (isChoiceControl(changed)) {
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

function withoutName(names: ReadonlySet<string>, name: string): ReadonlySet<string> {
	if (!names.has(name)) return names;
	const left = new Set(names);
	left.delete(name);
	return left;
}
