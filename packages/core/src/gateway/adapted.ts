import { COLLECTION_VERBS, VALUE_VERBS } from "./contract";
import type { CanResult, CollectionGateway, GatewayEvent, Unsubscribe, ValueGateway } from "./contract";
import { canOf, collectionGateway, valueGateway } from "./create";
import { MANY_VERBS } from "./many";
import type { EveryValueVerb } from "./needs";

export interface AdaptedDeclaration {
	readonly kind: unknown;
	readonly writes: readonly string[];
}

export type AdaptedGateway = CollectionGateway<unknown> | ValueGateway<unknown, EveryValueVerb>;

type Method = (this: unknown, input?: unknown) => unknown;

type Listener = (event: GatewayEvent) => void;

interface WritesInFlight {
	readonly during: (write: () => unknown) => unknown;
	readonly isWriting: () => boolean;
}

const READ_VERBS: readonly string[] = ["list", "get", "describe"];

const implementationIds = new WeakMap<object, string>();
let implementationsSeen = 0;

export function gatewayOverImplementation(
	name: string,
	declaration: AdaptedDeclaration,
	implementation: object,
	stableId?: string,
): AdaptedGateway {
	const id = stableId ?? idOfImplementation(implementation, name);
	const options = optionsOver(implementation, verbsOf(declaration, implementation), id);
	return declaration.kind === "collection" ? collectionGateway(options) : valueGateway(options);
}

export function isImplementation(declaration: AdaptedDeclaration, held: unknown): held is object {
	if (typeof held !== "object" || held === null) return false;
	return methodOf(held, declaration.kind === "collection" ? "list" : "get") !== null;
}

function optionsOver(implementation: object, verbs: readonly string[], id: string) {
	const writes = writesInFlight();
	return {
		id,
		handlers: Object.fromEntries(verbs.map((verb) => [verb, handlerOf(implementation, verb, writes)] as const)),
		settlesNow: Reflect.get(implementation, "settlesNow") === true,
		...cansOver(implementation, verbs),
		...subscribeOver(implementation, writes),
	};
}

function handlerOf(implementation: object, verb: string, writes: WritesInFlight): (input: unknown) => unknown {
	if (READ_VERBS.includes(verb)) return (input) => callVerb(implementation, verb, input);
	return (input) => writes.during(() => callVerb(implementation, verb, input));
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

function callVerb(implementation: object, verb: string, input: unknown): unknown {
	const method = methodOf(implementation, verb);
	if (method === null) throw new TypeError(`implementation.${verb} is not a function`);
	return method.call(implementation, input);
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
