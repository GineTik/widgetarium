import { useEffect, useState } from "react";
import { readSpec, specPathOf } from "@widgetarium/core/app-spec.js";
import type { SpecRead } from "@widgetarium/core/app-spec.js";
import type { SpecPort } from "./spec-port.js";

export interface HeldSpec {
	readonly path: string;
	readonly read: SpecRead | null;
	readonly problem: string | null;
	change(edit: (text: string) => string): void;
}

const NOT_WRITTEN = "There is no spec at {path} yet.";
const UNREAD = "{path} could not be read; the card shows what it last read.";

export function useSpec(port: SpecPort, app: string): HeldSpec {
	const path = specPathOf(app);
	const [problem, setProblem] = useState<string | null>(null);
	const read = useSpecRead(port, path, setProblem);
	const change = (edit: (text: string) => string): void => {
		setProblem(null);
		port.change(path, edit).catch((failure: unknown) => {
			console.error(`[widgetarium] ${path} was not changed`, failure);
			setProblem(failure instanceof Error ? failure.message : String(failure));
		});
	};
	return { path, read, problem, change };
}

function useSpecRead(port: SpecPort, path: string, onProblem: (said: string) => void): SpecRead | null {
	const [read, setRead] = useState<SpecRead | null>(null);
	useEffect(() => {
		const reads = { latest: 0 };
		const reread = (): void => readLatest({ port, path, reads, setRead, onProblem });
		reread();
		const unwatch = port.watch(path, reread);
		return () => {
			reads.latest = Number.NaN;
			unwatch();
		};
	}, [port, path, onProblem]);
	return read;
}

interface LatestRead {
	readonly port: SpecPort;
	readonly path: string;
	readonly reads: { latest: number };
	readonly setRead: (read: SpecRead) => void;
	readonly onProblem: (said: string) => void;
}

function readLatest({ port, path, reads, setRead, onProblem }: LatestRead): void {
	reads.latest += 1;
	const asked = reads.latest;
	port.read(path).then(
		(text) => {
			if (asked !== reads.latest) return;
			setRead(text === null ? { refusal: NOT_WRITTEN.replace("{path}", path) } : readSpec(text));
		},
		(failure: unknown) => reportUnread(path, failure, onProblem),
	);
}

function reportUnread(path: string, failure: unknown, onProblem: (said: string) => void): void {
	console.error(`[widgetarium] ${path} could not be read`, failure);
	onProblem(UNREAD.replace("{path}", path));
}
