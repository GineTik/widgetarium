import type { z } from "zod";
import type { RecordRef } from "./contract";

export interface ProblemIssue {
	readonly path: readonly PropertyKey[];
	readonly message: string;
}

export interface Problem {
	readonly label: string;
	readonly ref?: RecordRef;
	readonly issues: readonly ProblemIssue[];
}

export interface ProblemAt {
	readonly label: string;
	readonly ref?: RecordRef;
}

export interface GatewayContext {
	readonly schema: z.ZodType;
	report(problem: Problem): void;
	parse<T = unknown>(held: unknown, at: ProblemAt): T | null;
	keepOnly(seen: readonly ProblemAt[]): void;
}

type Listener = () => void;

export interface ProblemsStore {
	contextFor(key: string, schema: z.ZodType, binding?: string): GatewayContext;
	of(key: string): readonly Problem[];
	subscribe(listener: Listener): () => void;
}

const boards = new WeakMap<object, ProblemsStore>();
const NO_PROBLEMS: readonly Problem[] = [];
const LEFT_OUT = "[widgetarium] {key} left out {label}:";

export function problemsOf(board: object): ProblemsStore {
	const held = boards.get(board);
	if (held) return held;
	const made = createProblems();
	boards.set(board, made);
	return made;
}

export function createProblems(): ProblemsStore {
	const byKey = new Map<string, Map<string, Problem>>();
	const listedByKey = new Map<string, readonly Problem[]>();
	const bindingByKey = new Map<string, string>();
	const listeners = new Set<Listener>();
	let isTelling = false;
	const tell = () => {
		if (isTelling) return;
		isTelling = true;
		queueMicrotask(() => {
			isTelling = false;
			listeners.forEach((listener) => listener());
		});
	};
	const keptFor = (key: string) => {
		const held = byKey.get(key) ?? new Map<string, Problem>();
		byKey.set(key, held);
		return held;
	};
	const changed = (key: string, kept: Map<string, Problem>) => {
		listedByKey.set(key, [...kept.values()]);
		tell();
	};
	const settle = (key: string, address: string, problem: Problem | null) => {
		const kept = keptFor(key);
		const before = kept.get(address);
		if (!problem) {
			if (!before) return;
			kept.delete(address);
			changed(key, kept);
			return;
		}
		if (before && JSON.stringify(before) === JSON.stringify(problem)) return;
		if (!before) console.error(LEFT_OUT.replace("{key}", key).replace("{label}", problem.label), problem.issues);
		kept.set(address, problem);
		changed(key, kept);
	};
	return {
		contextFor(key, schema, binding = "") {
			if (bindingByKey.has(key) && bindingByKey.get(key) !== binding && byKey.get(key)?.size) {
				byKey.set(key, new Map());
				changed(key, byKey.get(key) as Map<string, Problem>);
			}
			bindingByKey.set(key, binding);
			return {
				schema,
				report: (problem) => settle(key, addressOf(problem), problem),
				parse<T>(held: unknown, at: ProblemAt): T | null {
					const parsed = schema.safeParse(held);
					if (parsed.success) {
						settle(key, addressOf(at), null);
						return parsed.data as T;
					}
					const issues = parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message }));
					settle(key, addressOf(at), { ...at, issues });
					return null;
				},
				keepOnly(seen) {
					const kept = keptFor(key);
					const addresses = new Set(seen.map(addressOf));
					const gone = [...kept.keys()].filter((address) => !addresses.has(address));
					if (gone.length === 0) return;
					gone.forEach((address) => kept.delete(address));
					changed(key, kept);
				},
			};
		},
		of: (key) => listedByKey.get(key) ?? NO_PROBLEMS,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

const addressOf = (at: ProblemAt) => at.ref ?? at.label;
