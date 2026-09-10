import type {
	Action,
	CanResult,
	CollectionGateway,
	GatewayEvent,
	MaybePromise,
	Query,
	Row,
	RowsResult,
	Unsubscribe,
	ValueGateway,
} from "./contract";
import { COLLECTION_VERBS, VALUE_VERBS } from "./contract";
import { isMatch, sortedRows } from "./match";

export interface ActionMeta {
	gatewayId: string;
	verb: string;
	subscribe(listener: (event: GatewayEvent) => void): Unsubscribe;
	readNow?: (input: unknown) => unknown;
}

type AnyHandler = (input: never) => MaybePromise<unknown>;

type HandlerMap = Record<string, AnyHandler>;

function withCan<I, O>(run: (input: I) => Promise<O>, can: () => CanResult): Action<I, O> {
	const held = run as Action<I, O>;
	held.can = can;
	return held;
}

export function canDo(verb?: { can(): CanResult } | null): boolean {
	return verb?.can().can === true;
}

export function action<I, O>(run: (input: I) => MaybePromise<O>): Action<I, O> {
	return withCan((input: I) => Promise.resolve(run(input)), () => ({ can: true }));
}

function refusedAction<I, O>(reason: string): Action<I, O> {
	return withCan<I, O>(() => Promise.reject(new Error(reason)), () => ({ can: false, reason }));
}

function createEmitter() {
	const listeners = new Set<(event: GatewayEvent) => void>();
	return {
		subscribe(listener: (event: GatewayEvent) => void): Unsubscribe {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		notify(event: GatewayEvent = {}) {
			for (const listener of listeners) listener(event);
		},
	};
}

// CONTEXT: list and get read; every other verb is a transition the cache must hear about
const READ_VERBS = new Set(["list", "get", "subscribe"]);

interface AssembleOptions {
	id: string;
	kind: "collection" | "value";
	handlers: HandlerMap;
	requested?: string[];
	subscribe?: (listener: (event: GatewayEvent) => void) => Unsubscribe;
	announcesOwnWrites?: boolean;
	settlesNow?: boolean;
}

type Subscribe = (listener: (event: GatewayEvent) => void) => Unsubscribe;

function combinedSubscribe(emitter: ReturnType<typeof createEmitter>, outer?: Subscribe): Subscribe {
	return (listener) => {
		const own = emitter.subscribe(listener);
		const held = outer?.(listener);
		return () => {
			own();
			held?.();
		};
	};
}

function buildVerb(options: AssembleOptions, verb: string, notify: () => void): Action<never, unknown> {
	const held = options.handlers[verb];
	if (!held) return refusedAction(`${options.id} has no "${verb}" — this source does not provide it`);
	const announces = options.announcesOwnWrites !== false && !READ_VERBS.has(verb);
	return withCan(async (input: never) => {
		const result = await held(input);
		if (announces) notify();
		return result;
	}, () => ({ can: true }));
}

function readNowHandlerFor(options: AssembleOptions, verb: string): ((input: unknown) => unknown) | undefined {
	const held = options.handlers[verb];
	if (!options.settlesNow || !held || !READ_VERBS.has(verb)) return undefined;
	return held as (input: unknown) => unknown;
}

function assemble(options: AssembleOptions): Record<string, unknown> {
	const emitter = createEmitter();
	const subscribe = combinedSubscribe(emitter, options.subscribe);
	const standard = options.kind === "collection" ? COLLECTION_VERBS : VALUE_VERBS;
	const verbs = new Set<string>([...standard, ...(options.requested ?? []), ...Object.keys(options.handlers)]);

	const gateway: Record<string, unknown> = { id: options.id, kind: options.kind, subscribe };
	for (const verb of verbs) {
		if (verb === "subscribe") continue;
		const built = buildVerb(options, verb, () => emitter.notify({}));
		(built as Action<never, unknown> & { meta: ActionMeta }).meta = { gatewayId: options.id, verb, subscribe, readNow: readNowHandlerFor(options, verb) };
		gateway[verb] = built;
	}
	return gateway;
}

export function collectionGateway<T>(options: {
	id: string;
	handlers: HandlerMap;
	requested?: string[];
	subscribe?: (listener: (event: GatewayEvent) => void) => Unsubscribe;
	announcesOwnWrites?: boolean;
	settlesNow?: boolean;
}): CollectionGateway<T> {
	return assemble({ ...options, kind: "collection" }) as unknown as CollectionGateway<T>;
}

export function valueGateway<T>(options: {
	id: string;
	handlers: HandlerMap;
	requested?: string[];
	subscribe?: (listener: (event: GatewayEvent) => void) => Unsubscribe;
	settlesNow?: boolean;
}): ValueGateway<T> {
	return assemble({ ...options, kind: "value" }) as unknown as ValueGateway<T>;
}

function isWrapped(entry: unknown, key: string): boolean {
	return typeof entry === "object" && entry !== null && key in entry && "value" in entry;
}

// CONTEXT: an entry already wrapped keeps its identity; a raw value is read by index
export function toRows<T>(entries: readonly (T | Row<T>)[], wrapKey: "ref" | "id" = "ref"): Row<T>[] {
	return entries.map((entry, index) =>
		isWrapped(entry, wrapKey)
			? { ref: String((entry as Record<string, unknown>)[wrapKey]), value: (entry as { value: T }).value }
			: { ref: `i${index}`, value: entry as T },
	);
}

export function applyQuery<T>(rows: Row<T>[], query?: Query | void): RowsResult<T> {
	const asked = query ?? {};
	const kept = asked.where?.length ? rows.filter((row) => isMatch(row.value, asked.where)) : rows;
	const ordered = sortedRows(kept, asked.sort);
	return { rows: asked.limit ? ordered.slice(0, asked.limit) : ordered, total: ordered.length };
}

let mintedArrays = 0;

type ArraySource<T> = readonly (T | Row<T>)[] | (() => readonly (T | Row<T>)[]);

function arrayReads<T>(source: ArraySource<T>): HandlerMap {
	const readAll = typeof source === "function" ? source : () => source;
	return {
		list: (query: Query | void) => applyQuery(toRows(readAll()), query),
		get: (ref: string) => toRows(readAll()).find((row) => row.ref === ref) ?? null,
	};
}

export function arrayGateway<T>(source: ArraySource<T>, handlers: HandlerMap = {}, id?: string): CollectionGateway<T> {
	mintedArrays += 1;
	return collectionGateway<T>({
		id: id ?? `array#${mintedArrays}`,
		handlers: { ...arrayReads(source), ...handlers },
		settlesNow: true,
	});
}

let mintedValues = 0;

export function soloGateway<T>(
	source: T | null | (() => T | null),
	handlers: HandlerMap = {},
	id?: string,
): ValueGateway<T> {
	mintedValues += 1;
	const readOne = typeof source === "function" ? (source as () => T | null) : () => source;
	return valueGateway<T>({
		id: id ?? `value#${mintedValues}`,
		handlers: { get: () => readOne(), ...handlers },
		settlesNow: true,
	});
}
