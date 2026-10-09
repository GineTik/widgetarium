import type { Unsubscribe } from "./contract";
import type { ActionMeta } from "./create";
import { isObject } from "../engine/is-object";

interface CacheEntry {
	status: "loading" | "ready" | "failed";
	data: unknown;
	failure: string | null;
	version: number;
}

const NOT_LOADED: CacheEntry = { status: "loading", data: null, failure: null, version: 0 };

const KEY_GAP_NO_PATH_HOLDS = "\u0000";

export type Runner = (input: unknown, signal: AbortSignal) => Promise<unknown>;

export type Extension = (before: unknown, signal: AbortSignal) => Promise<unknown>;

interface Tracked {
	run: Runner;
	input: unknown;
	listeners: Set<() => void>;
	ticket: number;
	controller: AbortController | null;
	inFlight: InFlight;
	queued: Extension[];
}

type InFlight =
	| { readonly kind: "idle" }
	| { readonly kind: "fetching" }
	| { readonly kind: "extending"; readonly extension: Extension };

const IDLE: InFlight = { kind: "idle" };
const FETCHING: InFlight = { kind: "fetching" };

type Subscriber = ActionMeta["subscribe"];

interface CacheState {
	entries: Map<string, CacheEntry>;
	tracked: Map<string, Tracked>;
	attached: Map<string, Map<Subscriber, { count: number; stop: Unsubscribe }>>;
	awaitingRefetch: Set<string>;
}

export function stableKey(input: unknown): string {
	if (input === undefined) return "";
	return JSON.stringify(sortKeys(input));
}

export function createGatewayCache() {
	const state: CacheState = { entries: new Map(), tracked: new Map(), attached: new Map(), awaitingRefetch: new Set() };
	return {
		read: (meta: ActionMeta, input: unknown): CacheEntry => readEntry(state, meta, input),
		subscribe: (meta: ActionMeta, input: unknown, run: Runner, listener: () => void) =>
			track(state, { meta, input, run, listener }),
		extend: (meta: ActionMeta, input: unknown, extension: Extension) => extend(state, keyOf(meta, input), extension),
		invalidate: (gatewayId: string) => invalidate(state, gatewayId),
		refetch: (gatewayIds: readonly string[]) => refetch(state, gatewayIds),
	};
}

export const gatewayCache = createGatewayCache();

function sortKeys(input: unknown): unknown {
	if (Array.isArray(input)) return input.map(sortKeys);
	if (isObject(input)) {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(input).sort()) sorted[key] = sortKeys(input[key]);
		return sorted;
	}
	return input;
}

function keyOf(meta: ActionMeta, input: unknown): string {
	return `${meta.gatewayId}${KEY_GAP_NO_PATH_HOLDS}${meta.verb}${KEY_GAP_NO_PATH_HOLDS}${stableKey(input)}`;
}

function notify(state: CacheState, key: string) {
	for (const listener of state.tracked.get(key)?.listeners ?? []) listener();
}

function settle(state: CacheState, key: string, ticket: number, next: (before?: CacheEntry) => CacheEntry) {
	if (state.tracked.get(key)?.ticket !== ticket) return;
	state.entries.set(key, next(state.entries.get(key)));
	notify(state, key);
}

async function fetchNow(state: CacheState, key: string): Promise<void> {
	const held = state.tracked.get(key);
	if (!held) return;
	if (held.inFlight.kind === "extending") held.queued.unshift(held.inFlight.extension);
	held.inFlight = FETCHING;
	const settled = settleAnswer(state, key, held, (signal) => held.run(held.input, signal));
	const ticket = held.ticket;
	await settled;
	if (held.inFlight.kind !== "fetching" || held.ticket !== ticket) return;
	held.inFlight = IDLE;
	await extendQueued(state, key, held);
}

async function extend(state: CacheState, key: string, extension: Extension): Promise<void> {
	const held = state.tracked.get(key);
	const before = state.entries.get(key);
	if (!held || before === undefined || before.data === null) return;
	if (held.inFlight.kind !== "idle") {
		held.queued.push(extension);
		return;
	}
	const extending: InFlight = { kind: "extending", extension };
	held.inFlight = extending;
	await settleAnswer(state, key, held, (signal) => extension(before.data, signal));
	if (held.inFlight !== extending) return;
	held.inFlight = IDLE;
	await extendQueued(state, key, held);
}

function extendQueued(state: CacheState, key: string, held: Tracked): Promise<void> {
	const queued = held.queued.shift();
	return queued ? extend(state, key, queued) : Promise.resolve();
}

function settleAnswer(
	state: CacheState,
	key: string,
	held: Tracked,
	answer: (signal: AbortSignal) => Promise<unknown>,
): Promise<void> {
	const ticket = ++held.ticket;
	return answer(freshSignal(held)).then(
		(data) =>
			settle(state, key, ticket, (before) => ({
				status: "ready",
				data,
				failure: null,
				version: (before?.version ?? 0) + 1,
			})),
		(failure: unknown) => settleFailure(state, key, ticket, failure),
	);
}

function settleFailure(state: CacheState, key: string, ticket: number, failure: unknown): void {
	if (state.tracked.get(key)?.ticket !== ticket) return;
	console.error(`Widgetarium: ${key.split(KEY_GAP_NO_PATH_HOLDS, 2).join(".")} failed`, failure);
	const said = failure instanceof Error ? failure.message : String(failure);
	settle(state, key, ticket, (before) => ({
		status: "failed",
		data: before?.data ?? null,
		failure: said,
		version: (before?.version ?? 0) + 1,
	}));
}

function freshSignal(held: Tracked): AbortSignal {
	held.controller?.abort();
	held.controller = new AbortController();
	return held.controller.signal;
}

function refetchOnceThisTick(state: CacheState, key: string) {
	if (state.awaitingRefetch.has(key)) return;
	state.awaitingRefetch.add(key);
	queueMicrotask(() => {
		state.awaitingRefetch.delete(key);
		fetchNow(state, key);
	});
}

async function refetch(state: CacheState, gatewayIds: readonly string[]): Promise<void> {
	const prefixes = gatewayIds.map((gatewayId) => `${gatewayId}${KEY_GAP_NO_PATH_HOLDS}`);
	const keys = [...state.tracked.keys()].filter((key) => prefixes.some((prefix) => key.startsWith(prefix)));
	await Promise.all(keys.map((key) => fetchNow(state, key)));
}

function invalidate(state: CacheState, gatewayId: string) {
	const prefix = `${gatewayId}${KEY_GAP_NO_PATH_HOLDS}`;
	for (const key of [...state.entries.keys()]) {
		if (!key.startsWith(prefix)) continue;
		if (state.tracked.get(key)?.listeners.size) refetchOnceThisTick(state, key);
		else state.entries.delete(key);
	}
}

// TRADE-OFF: keyed on the subscribe function too, not only gatewayId — two live gateways can share an id for a beat when one tile's board remounts before the outdoing one detaches
function attach(state: CacheState, meta: ActionMeta) {
	const bySubscriber =
		state.attached.get(meta.gatewayId) ?? new Map<Subscriber, { count: number; stop: Unsubscribe }>();
	state.attached.set(meta.gatewayId, bySubscriber);
	const held = bySubscriber.get(meta.subscribe);
	if (held) {
		held.count += 1;
		return;
	}
	const stop = meta.subscribe(() => invalidate(state, meta.gatewayId));
	bySubscriber.set(meta.subscribe, { count: 1, stop });
}

function detach(state: CacheState, meta: ActionMeta) {
	const bySubscriber = state.attached.get(meta.gatewayId);
	if (!bySubscriber) return;
	const held = bySubscriber.get(meta.subscribe);
	if (!held) return;
	held.count -= 1;
	if (held.count > 0) return;
	held.stop();
	bySubscriber.delete(meta.subscribe);
	if (bySubscriber.size === 0) state.attached.delete(meta.gatewayId);
}

interface UntrackRequest {
	key: string;
	held: Tracked;
	listener: () => void;
	meta: ActionMeta;
}

function untrack(state: CacheState, { key, held, listener, meta }: UntrackRequest) {
	held.listeners.delete(listener);
	detach(state, meta);
	if (held.listeners.size > 0) return;
	held.ticket += 1;
	held.controller?.abort();
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
	const nothingWasSubscribed = !state.attached.has(meta.gatewayId);
	const held = state.tracked.get(key) ?? {
		run,
		input,
		listeners: new Set<() => void>(),
		ticket: 0,
		controller: null,
		inFlight: IDLE,
		queued: [],
	};
	keepFreshestRun(held, run, input);
	state.tracked.set(key, held);
	held.listeners.add(listener);
	attach(state, meta);
	if (nothingWasSubscribed || !state.entries.has(key)) fetchNow(state, key);
	return () => untrack(state, { key, held, listener, meta });
}

function settleNow(state: CacheState, key: string, meta: ActionMeta, input: unknown): CacheEntry {
	let data: unknown;
	try {
		data = (meta.readNow as NonNullable<ActionMeta["readNow"]>)(input);
	} catch (failure: unknown) {
		return {
			status: "failed",
			data: null,
			failure: failure instanceof Error ? failure.message : String(failure),
			version: 1,
		};
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

function keepFreshestRun(held: Tracked, run: Runner, input: unknown) {
	held.run = run;
	held.input = input;
}

function isThenable(held: unknown): boolean {
	return typeof (held as { then?: unknown } | null)?.then === "function";
}
