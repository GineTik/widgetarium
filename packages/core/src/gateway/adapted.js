import { COLLECTION_VERBS, VALUE_VERBS } from "./contract";
import { collectionGateway, valueGateway } from "./create";
import { MANY_VERBS } from "./many";

export const ENGINE_GATEWAY = Symbol.for("widgetarium.engine-gateway");

export function gatewayOverImplementation(name, declaration, implementation) {
	const standard = declaration.kind === "collection" ? COLLECTION_VERBS : VALUE_VERBS;
	const verbs = [...new Set([...standard, ...declaration.writes, ...MANY_VERBS])].filter(
		(verb) => typeof implementation[verb] === "function",
	);
	const handlers = Object.fromEntries(verbs.map((verb) => [verb, (input) => implementation[verb](input)]));
	const subscribe =
		typeof implementation.subscribe === "function"
			? { subscribe: (listener) => implementation.subscribe(() => listener({})) }
			: {};
	const made = declaration.kind === "collection" ? collectionGateway : valueGateway;
	return made({
		id: idOfImplementation(implementation, name),
		handlers,
		settlesNow: implementation.settlesNow === true,
		...subscribe,
	});
}

export function isImplementation(declaration, held) {
	if (typeof held !== "object" || held === null) return false;
	return typeof held[declaration.kind === "collection" ? "list" : "get"] === "function";
}

const implementationIds = new WeakMap();
let implementationsSeen = 0;

function idOfImplementation(implementation, name) {
	if (!implementationIds.has(implementation)) {
		implementationsSeen += 1;
		implementationIds.set(implementation, `implementation#${implementationsSeen}`);
	}
	return `${implementationIds.get(implementation)}/${name}`;
}
