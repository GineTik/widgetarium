import { COLLECTION_VERBS, VALUE_VERBS } from "./contract";
import type { CollectionGateway, GatewayEvent, Unsubscribe, ValueGateway } from "./contract";
import { collectionGateway, valueGateway } from "./create";
import { MANY_VERBS } from "./many";
import type { EveryValueVerb } from "./needs";

export const ENGINE_GATEWAY = Symbol.for("widgetarium.engine-gateway");

export interface AdaptedDeclaration {
	readonly kind: unknown;
	readonly writes: readonly string[];
}

export type AdaptedGateway = CollectionGateway<unknown> | ValueGateway<unknown, EveryValueVerb>;

type Method = (this: unknown, input?: unknown) => unknown;

type Listener = (event: GatewayEvent) => void;

const implementationIds = new WeakMap<object, string>();
let implementationsSeen = 0;

export function gatewayOverImplementation(
	name: string,
	declaration: AdaptedDeclaration,
	implementation: object,
): AdaptedGateway {
	const standard = declaration.kind === "collection" ? COLLECTION_VERBS : VALUE_VERBS;
	const verbs = [...new Set([...standard, ...declaration.writes, ...MANY_VERBS])].filter(
		(verb) => methodOf(implementation, verb) !== null,
	);
	const handlers = Object.fromEntries(
		verbs.map((verb) => [verb, (input: unknown) => callVerb(implementation, verb, input)] as const),
	);
	const options = {
		id: idOfImplementation(implementation, name),
		handlers,
		settlesNow: Reflect.get(implementation, "settlesNow") === true,
		...subscribeOver(implementation),
	};
	return declaration.kind === "collection" ? collectionGateway(options) : valueGateway(options);
}

export function isImplementation(declaration: AdaptedDeclaration, held: unknown): held is object {
	if (typeof held !== "object" || held === null) return false;
	return methodOf(held, declaration.kind === "collection" ? "list" : "get") !== null;
}

function subscribeOver(implementation: object): { subscribe?: (listener: Listener) => Unsubscribe } {
	if (methodOf(implementation, "subscribe") === null) return {};
	return {
		subscribe: (listener) => {
			const stop = callVerb(implementation, "subscribe", () => listener({}));
			return () => {
				if (isMethod(stop)) stop.call(undefined);
			};
		},
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
