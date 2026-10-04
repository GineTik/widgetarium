import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import type { SpecRead } from "@widgetarium/core/app-spec.js";
import type { SpecPort } from "./spec-port.js";

export interface HeldSpec {
	readonly path: string;
	readonly read: SpecRead | null;
	readonly problem: string | null;
	change(edit: (text: string) => string): void;
}

type HeldText = string | null | undefined;

interface SpecText {
	readonly text: HeldText;
	readonly setText: (text: HeldText) => void;
	readonly reads: MutableRefObject<number>;
	readonly reread: () => void;
}

const NOT_WRITTEN = "There is no spec at {path} yet.";
const UNREAD = "{path} could not be read; the card shows what it last read.";

export function useSpec(port: SpecPort, app: string): HeldSpec {
	const path = specPathOf(app);
	const [problem, setProblem] = useState<string | null>(null);
	const held = useSpecText(port, path, setProblem);
	const read = useMemo(() => readOf(held.text, path), [held.text, path]);
	const change = (edit: (text: string) => string): void => {
		setProblem(null);
		if (typeof held.text !== "string") return;
		const shown = editedOrProblem(held.text, edit, setProblem);
		if (shown === null) return;
		held.reads.current += 1;
		held.setText(shown);
		port.change(path, edit).catch((failure: unknown) => {
			console.error(`[widgetarium] ${path} was not changed`, failure);
			setProblem(failure instanceof Error ? failure.message : String(failure));
			held.reread();
		});
	};
	return { path, read, problem, change };
}

function readOf(text: HeldText, path: string): SpecRead | null {
	if (text === undefined) return null;
	return text === null ? { refusal: NOT_WRITTEN.replace("{path}", path) } : readSpec(text);
}

function editedOrProblem(
	text: string,
	edit: (text: string) => string,
	onProblem: (said: string) => void,
): string | null {
	try {
		return edit(text);
	} catch (failure) {
		onProblem(failure instanceof Error ? failure.message : String(failure));
		return null;
	}
}

function useSpecText(port: SpecPort, path: string, onProblem: (said: string) => void): SpecText {
	const [text, setText] = useState<HeldText>(undefined);
	const reads = useRef(0);
	const reread = (): void => readLatest({ port, path, reads, setText, onProblem });
	useEffect(() => {
		readLatest({ port, path, reads, setText, onProblem });
		const unwatch = port.watch(path, () => readLatest({ port, path, reads, setText, onProblem }));
		return () => {
			reads.current += 1;
			unwatch();
		};
	}, [port, path, onProblem]);
	return { text, setText, reads, reread };
}

interface LatestRead {
	readonly port: SpecPort;
	readonly path: string;
	readonly reads: MutableRefObject<number>;
	readonly setText: (text: HeldText) => void;
	readonly onProblem: (said: string) => void;
}

function readLatest({ port, path, reads, setText, onProblem }: LatestRead): void {
	reads.current += 1;
	const asked = reads.current;
	port.read(path).then(
		(text) => {
			if (asked === reads.current) setText(text);
		},
		(failure: unknown) => reportUnread(path, failure, onProblem),
	);
}

function reportUnread(path: string, failure: unknown, onProblem: (said: string) => void): void {
	console.error(`[widgetarium] ${path} could not be read`, failure);
	onProblem(UNREAD.replace("{path}", path));
}
