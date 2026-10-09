import type { z } from "zod";
import { COLLECTION_VERBS, READ_VERBS, VALUE_VERBS } from "./contract";
import type { CanResult, CollectionGateway, GatewayEvent, Unsubscribe, ValueGateway } from "./contract";
import { canOf, collectionGateway, valueGateway } from "./create";
import { MANY_VERBS } from "./many";
import type { EveryValueVerb } from "./needs";
import { classNameOf, queryInputOf } from "./declaration";
import { handlerContextOf } from "./handler-context";
import type { HandlerHost } from "./handler-context";

export interface AdaptedDeclaration {
	readonly kind: unknown;
	readonly writes: readonly string[];
	readonly input?: z.ZodType | undefined;
}

export type AdaptedGateway = CollectionGateway<unknown> | ValueGateway<unknown, EveryValueVerb>;

type Method = (this: unknown, ...given: readonly unknown[]) => unknown;

type Handler = (input: unknown, signal?: AbortSignal) => unknown;

type Listener = (event: GatewayEvent) => void;

interface WritesInFlight {
	readonly during: (write: () => unknown) => unknown;
	readonly isWriting: () => boolean;
}

const implementationIds = new WeakMap<object, string>();
let implementationsSeen = 0;

export interface Adapting {
	readonly id?: string;
	readonly host: HandlerHost;
}

interface Asking {
	readonly host: HandlerHost;
	readonly declaredInput: z.ZodType | undefined;
}

const NO_QUERY_INPUT =
	"the query of {name} declares no input, so nothing can check what it is asked: declare it with IQuery.input(schema)";

const NEVER_ABORTED = new AbortController().signal;

export function gatewayOverImplementation(
	name: string,
	declaration: AdaptedDeclaration,
	implementation: object,
	{ id = idOfImplementation(implementation, name), host }: Adapting,
): AdaptedGateway {
	const asking = { host, declaredInput: declaration.input };
	const options = optionsOver(implementation, verbsOf(declaration, implementation), { id, asking });
	return declaration.kind === "collection" ? collectionGateway(options) : valueGateway(options);
}

export function isImplementation(declaration: AdaptedDeclaration, held: unknown): held is object {
	if (typeof held !== "object" || held === null) return false;
	return (
		methodOf(held, "query") !== null || methodOf(held, declaration.kind === "collection" ? "list" : "get") !== null
	);
}

function optionsOver(
	implementation: object,
	verbs: readonly string[],
	{ id, asking }: { readonly id: string; readonly asking: Asking },
) {
	const writes = writesInFlight();
	const handlerFor = (verb: string): Handler =>
		verb === "query" ? askedOf(implementation, asking) : handlerOf(implementation, verb, writes);
	return {
		id,
		handlers: Object.fromEntries(verbs.map((verb) => [verb, handlerFor(verb)] as const)),
		settlesNow: Reflect.get(implementation, "settlesNow") === true,
		...cansOver(implementation, verbs),
		...subscribeOver(implementation, writes),
	};
}

function handlerOf(implementation: object, verb: string, writes: WritesInFlight): Handler {
	if (READ_VERBS.includes(verb)) return (input) => callVerb(implementation, verb, input);
	return (input) => writes.during(() => callVerb(implementation, verb, input));
}

function askedOf(implementation: object, { host, declaredInput }: Asking): Handler {
	const madeBy: unknown = Reflect.get(implementation, "constructor");
	const input = queryInputOf(madeBy) ?? declaredInput;
	if (!input) return () => Promise.reject(new TypeError(NO_QUERY_INPUT.replace("{name}", classNameOf(madeBy))));
	return (asked, signal = NEVER_ABORTED) =>
		callVerb(implementation, "query", input.parse(asked), handlerContextOf(host, signal));
}

function writesInFlight(): WritesInFlight {
	let open = 0;
	const settle = (): void => {
		open -= 1;
	};
	return {
		isWriting: () => open > 0,
		during: (write) => {
			open += 1;
			return settledAfter(write, settle);
		},
	};
}

function settledAfter(write: () => unknown, settle: () => void): unknown {
	try {
		const result = write();
		if (isThenable(result)) return Promise.resolve(result).finally(settle);
		settle();
		return result;
	} catch (failure) {
		settle();
		throw failure;
	}
}

function isThenable(held: unknown): held is PromiseLike<unknown> {
	return typeof held === "object" && held !== null && typeof Reflect.get(held, "then") === "function";
}

function verbsOf(declaration: AdaptedDeclaration, implementation: object): string[] {
	const standard = declaration.kind === "collection" ? COLLECTION_VERBS : VALUE_VERBS;
	return [...new Set([...standard, ...READ_VERBS, ...declaration.writes, ...MANY_VERBS])].filter(
		(verb) => methodOf(implementation, verb) !== null,
	);
}

function cansOver(implementation: object, verbs: readonly string[]): { cans?: Record<string, () => CanResult> } {
	if (methodOf(implementation, "can") === null) return {};
	return { cans: Object.fromEntries(verbs.map((verb) => [verb, () => canOf(implementation, verb)] as const)) };
}

function subscribeOver(
	implementation: object,
	writes: WritesInFlight,
): { subscribe?: (listener: Listener) => Unsubscribe } {
	if (methodOf(implementation, "subscribe") === null) return {};
	const heardUnlessWriting = (listener: Listener) => (): void => {
		if (!writes.isWriting()) listener({});
	};
	return { subscribe: (listener) => subscribedTo(implementation, heardUnlessWriting(listener)) };
}

function subscribedTo(implementation: object, changed: () => void): Unsubscribe {
	const stop = callVerb(implementation, "subscribe", changed);
	return () => {
		if (isMethod(stop)) stop.call(undefined);
	};
}

function callVerb(implementation: object, verb: string, ...given: unknown[]): unknown {
	const method = methodOf(implementation, verb);
	if (method === null) throw new TypeError(`implementation.${verb} is not a function`);
	return method.apply(implementation, given);
}

function methodOf(implementation: object, verb: string): Method | null {
	const held: unknown = Reflect.get(implementation, verb);
	return isMethod(held) ? held : null;
}

function isMethod(held: unknown): held is Method {
	return typeof held === "function";
}

function idOfImplementation(implementation: object, name: string): string {
	const known = implementationIds.get(implementation);
	if (known !== undefined) return `${known}/${name}`;
	implementationsSeen += 1;
	const minted = `implementation#${implementationsSeen}`;
	implementationIds.set(implementation, minted);
	return `${minted}/${name}`;
}
