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
import type { EveryValueVerb } from "./needs";
import { isMatch, pageOf, sortRows } from "./match";
import { isAction, verbOf } from "./verbs-of";

export interface ActionMeta {
	gatewayId: string;
	verb: string;
	subscribe(listener: (event: GatewayEvent) => void): Unsubscribe;
	readNow?: (input: unknown) => unknown;
}

type AnyHandler = (input: never) => MaybePromise<unknown>;

type HandlerMap = Record<string, AnyHandler>;

const READ_VERBS = new Set(["list", "get", "subscribe"]);

interface AssembleOptions {
	id: string;
	kind: "collection" | "value";
	handlers: HandlerMap;
	cans?: Record<string, () => CanResult>;
	requested?: string[];
	subscribe?: (listener: (event: GatewayEvent) => void) => Unsubscribe;
	announcesOwnWrites?: boolean;
	settlesNow?: boolean;
}

type Subscribe = (listener: (event: GatewayEvent) => void) => Unsubscribe;

let mintedArrays = 0;

type WrappedEntry<T> = { ref?: string; id?: string; value: T };

type ArrayEntries<T> = readonly (T | WrappedEntry<T>)[];

type ArraySource<T> = ArrayEntries<T> | (() => ArrayEntries<T>);

type HeldOptions = { subscribe?: Subscribe };

let mintedValues = 0;

const NOT_ASSEMBLED = "{id} was assembled without every standard verb";

export function canDo(verb?: { can(): CanResult } | null): boolean {
	return verb?.can().can === true;
}

export function action<I, O>(run: (input: I) => MaybePromise<O>): Action<I, O> {
	return withCan(
		(input: I) => Promise.resolve(run(input)),
		() => ({ can: true }),
	);
}

export function refuseVerb(original: unknown, reason: string): Action<never, unknown> {
	const refused = refuseAction<never, unknown>(reason) as Action<never, unknown> & { meta?: ActionMeta };
	const meta = (original as { meta?: ActionMeta } | null)?.meta;
	if (meta) refused.meta = meta;
	return refused;
}

export function collectionGateway<T>(options: {
	id: string;
	handlers: HandlerMap;
	cans?: Record<string, () => CanResult>;
	requested?: string[];
	subscribe?: (listener: (event: GatewayEvent) => void) => Unsubscribe;
	announcesOwnWrites?: boolean;
	settlesNow?: boolean;
}): CollectionGateway<T> {
	const gateway = assemble({ ...options, kind: "collection" });
	if (!isCollectionGateway<T>(gateway)) throw new Error(NOT_ASSEMBLED.replace("{id}", options.id));
	return gateway;
}

export function valueGateway<T>(options: {
	id: string;
	handlers: HandlerMap;
	cans?: Record<string, () => CanResult>;
	requested?: string[];
	subscribe?: (listener: (event: GatewayEvent) => void) => Unsubscribe;
	settlesNow?: boolean;
}): ValueGateway<T, EveryValueVerb> {
	const gateway = assemble({ ...options, kind: "value" });
	if (!isValueGateway<T>(gateway)) throw new Error(NOT_ASSEMBLED.replace("{id}", options.id));
	return gateway;
}

export const rowOf = <T>(value: unknown, ref: string): Row<T> =>
	(isRecord(value) ? { ...(value as object), ref } : { value, ref }) as Row<T>;

export function toRows<T>(entries: ArrayEntries<T>, wrapKey: "ref" | "id" = "ref"): Row<T>[] {
	return entries.map((entry, index) =>
		isWrapped(entry, wrapKey) ? rowOf<T>(entry.value, String(entry[wrapKey])) : rowOf<T>(entry, `i${index}`),
	);
}

// TRADE-OFF: a row whose only field is value reads back as that value; a list of primitives has nowhere else to keep it
export const valueIn = <T>(row: Row<T>): T => {
	const { ref, ...held } = row as Row<T> & { ref: string };
	const named = Object.keys(held);
	return (named.length === 1 && "value" in held ? held.value : held) as T;
};

export function applyQuery<T>(rows: Row<T>[], query?: Query | void): RowsResult<T> {
	const asked = query ?? {};
	const kept = asked.where?.length ? rows.filter((row) => isMatch(row, asked.where)) : rows;
	const ordered = sortRows(kept, asked.sort);
	return { rows: pageOf(ordered, asked), total: ordered.length };
}

export function arrayGateway<T>(
	source: ArraySource<T>,
	handlers: HandlerMap = {},
	id?: string,
	{ subscribe }: HeldOptions = {},
): CollectionGateway<T> {
	mintedArrays += 1;
	return collectionGateway<T>({
		id: id ?? `array#${mintedArrays}`,
		handlers: { ...arrayReads(source), ...handlers },
		settlesNow: true,
		...(subscribe ? { subscribe } : {}),
	});
}

export function soloGateway<T>(
	source: T | null | (() => T | null),
	handlers: HandlerMap = {},
	id?: string,
	{ subscribe }: HeldOptions = {},
): ValueGateway<T, EveryValueVerb> {
	mintedValues += 1;
	const readOne = typeof source === "function" ? (source as () => T | null) : () => source;
	return valueGateway<T>({
		id: id ?? `value#${mintedValues}`,
		handlers: { get: () => readOne(), ...handlers },
		settlesNow: true,
		...(subscribe ? { subscribe } : {}),
	});
}

function withCan<I, O>(run: (input: I) => Promise<O>, can: () => CanResult): Action<I, O> {
	const held = run as Action<I, O>;
	held.can = can;
	return held;
}

function refuseAction<I, O>(reason: string): Action<I, O> {
	return withCan<I, O>(
		() => Promise.reject(new Error(reason)),
		() => ({ can: false, reason }),
	);
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

function combineSubscribe(emitter: ReturnType<typeof createEmitter>, outer?: Subscribe): Subscribe {
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
	if (!held) return refuseAction(refusalOf(options, verb));
	const announces = options.announcesOwnWrites !== false && !READ_VERBS.has(verb);
	return withCan(
		async (input: never) => {
			const result = await held(input);
			if (announces) notify();
			return result;
		},
		options.cans?.[verb] ?? (() => ({ can: true })),
	);
}

function readNowHandlerFor(options: AssembleOptions, verb: string): ((input: unknown) => unknown) | undefined {
	const held = options.handlers[verb];
	if (!options.settlesNow || !held || !READ_VERBS.has(verb)) return undefined;
	return held as (input: unknown) => unknown;
}

function assemble(options: AssembleOptions): object {
	const emitter = createEmitter();
	const subscribe = combineSubscribe(emitter, options.subscribe);
	const standard = options.kind === "collection" ? COLLECTION_VERBS : VALUE_VERBS;
	const verbs = new Set<string>([...standard, ...(options.requested ?? []), ...Object.keys(options.handlers)]);

	const gateway: Record<string, unknown> = { id: options.id, kind: options.kind, subscribe };
	for (const verb of verbs) {
		if (verb === "subscribe") continue;
		const built = buildVerb(options, verb, () => emitter.notify({}));
		const readNow = readNowHandlerFor(options, verb);
		(built as Action<never, unknown> & { meta: ActionMeta }).meta = {
			gatewayId: options.id,
			verb,
			subscribe,
			...(readNow ? { readNow } : {}),
		};
		gateway[verb] = built;
	}
	return gateway;
}

function isCollectionGateway<T>(held: object): held is CollectionGateway<T> {
	return Reflect.get(held, "kind") === "collection" && COLLECTION_VERBS.every((verb) => isAction(verbOf(held, verb)));
}

function isValueGateway<T>(held: object): held is ValueGateway<T, EveryValueVerb> {
	return Reflect.get(held, "kind") === "value" && VALUE_VERBS.every((verb) => isAction(verbOf(held, verb)));
}

function isWrapped<T>(entry: T | WrappedEntry<T>, key: "ref" | "id"): entry is WrappedEntry<T> {
	return typeof entry === "object" && entry !== null && key in entry && "value" in entry;
}

const isRecord = (held: unknown) => typeof held === "object" && held !== null && !Array.isArray(held);

function arrayReads<T>(source: ArraySource<T>): HandlerMap {
	const readAll = typeof source === "function" ? source : () => source;
	return {
		list: (query: Query | void) => applyQuery(toRows(readAll()), query),
		get: (ref: string) => toRows(readAll()).find((row) => row.ref === ref) ?? null,
	};
}

// TRADE-OFF: a can() authored for a verb nothing implements is the reason the author wanted heard, so it outranks the generic one
function refusalOf(options: AssembleOptions, verb: string): string {
	const declared = options.cans?.[verb]?.();
	if (declared?.can === false && declared.reason) return declared.reason;
	return `${options.id} has no "${verb}" — this source does not provide it`;
}
