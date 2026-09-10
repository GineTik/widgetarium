import type { Unsubscribe } from "./contract";
import type { ActionMeta } from "./create";

interface CacheEntry {
	status: "loading" | "ready" | "failed";
	data: unknown;
	failure: string | null;
	version: number;
}

const NOT_LOADED: CacheEntry = { status: "loading", data: null, failure: null, version: 0 };

// CONTEXT: a gateway id may carry any path character; no path carries a NUL
const KEY_GAP = "\u0000";

function sortedValue(input: unknown): unknown {
	if (Array.isArray(input)) return input.map(sortedValue);
	if (input && typeof input === "object") {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(input as Record<string, unknown>).sort()) {
			sorted[key] = sortedValue((input as Record<string, unknown>)[key]);
		}
		return sorted;
	}
	return input;
}

export function stableKey(input: unknown): string {
	if (input === undefined) return "";
	return JSON.stringify(sortedValue(input));
}

type Runner = (input: unknown) => Promise<unknown>;

interface Tracked {
	meta: ActionMeta;
	run: Runner;
	input: unknown;
	listeners: Set<() => void>;
	ticket: number;
}

interface CacheState {
	entries: Map<string, CacheEntry>;
	tracked: Map<string, Tracked>;
	attached: Map<string, { count: number; stop: Unsubscribe }>;
	awaitingRefetch: Set<string>;
}

const keyOf = (meta: ActionMeta, input: unknown) => `${meta.gatewayId}${KEY_GAP}${meta.verb}${KEY_GAP}${stableKey(input)}`;

function notify(state: CacheState, key: string) {
	for (const listener of state.tracked.get(key)?.listeners ?? []) listener();
}

function settle(state: CacheState, key: string, ticket: number, next: (before?: CacheEntry) => CacheEntry) {
	if (state.tracked.get(key)?.ticket !== ticket) return;
	state.entries.set(key, next(state.entries.get(key)));
	notify(state, key);
}

function fetchNow(state: CacheState, key: string) {
	const held = state.tracked.get(key);
	if (!held) return;
	const ticket = ++held.ticket;
	held.run(held.input).then(
		(data) => settle(state, key, ticket, (before) => ({ status: "ready", data, failure: null, version: (before?.version ?? 0) + 1 })),
		(failure: unknown) => {
			console.error(`Widgetarium: ${key.split(KEY_GAP, 2).join(".")} failed`, failure);
			const said = failure instanceof Error ? failure.message : String(failure);
			settle(state, key, ticket, (before) => ({ status: "failed", data: before?.data ?? null, failure: said, version: (before?.version ?? 0) + 1 }));
		},
	);
}

// TRADE-OFF: one refetch per key per tick, because a single write reaches this through the wrapper's emitter and the base's alike, and each one used to re-read the whole folder
function refetchOnceThisTick(state: CacheState, key: string) {
	if (state.awaitingRefetch.has(key)) return;
	state.awaitingRefetch.add(key);
	queueMicrotask(() => {
		state.awaitingRefetch.delete(key);
		fetchNow(state, key);
	});
}

function invalidate(state: CacheState, gatewayId: string) {
	const prefix = `${gatewayId}${KEY_GAP}`;
	for (const key of [...state.entries.keys()]) {
		if (!key.startsWith(prefix)) continue;
		if (state.tracked.get(key)?.listeners.size) refetchOnceThisTick(state, key);
		else state.entries.delete(key);
	}
}

function attach(state: CacheState, meta: ActionMeta) {
	const held = state.attached.get(meta.gatewayId);
	if (held) {
		held.count += 1;
		return;
	}
	const stop = meta.subscribe(() => invalidate(state, meta.gatewayId));
	state.attached.set(meta.gatewayId, { count: 1, stop });
}

function detach(state: CacheState, gatewayId: string) {
	const held = state.attached.get(gatewayId);
	if (!held) return;
	held.count -= 1;
	if (held.count > 0) return;
	held.stop();
	state.attached.delete(gatewayId);
}

function untrack(state: CacheState, key: string, held: Tracked, listener: () => void) {
	held.listeners.delete(listener);
	detach(state, held.meta.gatewayId);
	if (held.listeners.size > 0) return;
	held.ticket += 1;
	state.tracked.delete(key);
}

interface TrackRequest {
	meta: ActionMeta;
	input: unknown;
	run: Runner;
	listener: () => void;
}

function track(state: CacheState, { meta, input, run, listener }: TrackRequest): Unsubscribe {
	const key = keyOf(meta, input);
	const held = state.tracked.get(key) ?? { meta, run, input, listeners: new Set<() => void>(), ticket: 0 };
	// CONTEXT: the freshest closure wins — a refetch must not read through a stale config
	held.run = run;
	held.input = input;
	state.tracked.set(key, held);
	held.listeners.add(listener);
	attach(state, meta);
	if (!state.entries.has(key)) fetchNow(state, key);
	return () => untrack(state, key, held, listener);
}

const isThenable = (held: unknown): boolean => typeof (held as { then?: unknown } | null)?.then === "function";

function settleNow(state: CacheState, key: string, meta: ActionMeta, input: unknown): CacheEntry {
	let data: unknown;
	try {
		data = (meta.readNow as NonNullable<ActionMeta["readNow"]>)(input);
	} catch (failure: unknown) {
		return { status: "failed", data: null, failure: failure instanceof Error ? failure.message : String(failure), version: 1 };
	}
	if (isThenable(data)) return NOT_LOADED;
	const entry: CacheEntry = { status: "ready", data, failure: null, version: 1 };
	state.entries.set(key, entry);
	return entry;
}

function readEntry(state: CacheState, meta: ActionMeta, input: unknown): CacheEntry {
	const key = keyOf(meta, input);
	const held = state.entries.get(key);
	if (held) return held;
	if (!meta.readNow) return NOT_LOADED;
	return settleNow(state, key, meta, input);
}

export function createGatewayCache() {
	const state: CacheState = { entries: new Map(), tracked: new Map(), attached: new Map(), awaitingRefetch: new Set() };
	return {
		read: (meta: ActionMeta, input: unknown): CacheEntry => readEntry(state, meta, input),
		subscribe: (meta: ActionMeta, input: unknown, run: Runner, listener: () => void) => track(state, { meta, input, run, listener }),
		invalidate: (gatewayId: string) => invalidate(state, gatewayId),
	};
}

export const gatewayCache = createGatewayCache();
