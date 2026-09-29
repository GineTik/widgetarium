import { createElement as h, useMemo } from "react";
import { defaultImplementationFor } from "./gateway/defaults";
import { refusedVerb } from "./gateway/create";
import { ENGINE_GATEWAY, gatewayOverImplementation, isImplementation } from "./gateway/adapted";
import { stableKey } from "./gateway/cache";
import { useData } from "./gateway/use-data";
import { declarationIn, defaultOf } from "./gateway/declared";
import { withManyVerbs } from "./gateway/many";
import { checkedCollection, checkedValueUpdate } from "./gateway/parsed";

const NOT_READ = "A prop could not be read";

const declaredInterfaces = new WeakMap();

export function declaredWidget(props, draw) {
	const declared = Object.entries(props).map(([name, held]) => [name, declarationOfInterface(held)]);
	function InjectedWidget(given) {
		const drawn = {};
		const failures = [];
		for (const [name, declaration] of declared) {
			const read = readOf(name, declaration, given);
			drawn[name] = read.value;
			if (read.failure) failures.push(`${name}: ${read.failure}`);
		}
		if (failures.length > 0) return notReadNotice(failures);
		return draw(drawn);
	}
	InjectedWidget.declared = props;
	return InjectedWidget;
}

function declarationOfInterface(held) {
	const declaration = declarationIn(held);
	if (declaration) declaredInterfaces.set(declaration, held);
	return declaration;
}

const HANDED = {
	passed: (name, declaration, given) => given[declaration.passed] ?? null,
	slot: (name, declaration, given) => given.slots?.[name] ?? given[name] ?? null,
	mounts: (name, declaration, given) => given.mounts?.[name] ?? given[name] ?? [],
};

function readOf(name, declaration, given) {
	const hand = HANDED[declaration.kind];
	if (hand) return { value: hand(name, declaration, given), failure: null };
	return useDrawn(name, declaration, given[name]);
}

function notReadNotice(failures) {
	return h("div", { className: "wg-error" }, [
		h("b", { key: "what" }, NOT_READ),
		...failures.map((said) => h("code", { key: said }, said)),
	]);
}

function useDrawn(name, declaration, given) {
	const gateway = useGateway(name, declaration, given);
	if (declaration.kind === "collection")
		return { value: useCollectionDrawn(name, declaration, gateway), failure: null };
	return useValueDrawn(name, declaration, gateway);
}

function useGateway(name, declaration, given) {
	const held = heldAs(declaration, given);
	return useMemo(() => GATEWAY_OVER[held](name, declaration, given), [held === "plain" ? stableKey(given) : given]);
}

const GATEWAY_OVER = {
	gateway: (name, declaration, given) => given,
	implementation: (name, declaration, given) =>
		given[ENGINE_GATEWAY] ?? gatewayOverImplementation(name, declaration, given),
	plain: gatewayOverGiven,
};

function heldAs(declaration, given) {
	if (isGateway(given)) return "gateway";
	if (isImplementation(declaration, given)) return "implementation";
	return "plain";
}

function useCollectionDrawn(name, declaration, gateway) {
	return useMemo(
		() => pickedOnly(name, declaration, withManyVerbs({ ...checkedCollection(gateway, declaration, name) })),
		[gateway],
	);
}

const MANY_OF = { create: "createMany", update: "updateMany", remove: "removeMany" };
const NOT_PICKED = 'prop "{name}" did not pick {verb}, so the widget cannot {verb}';

function pickedOnly(name, declaration, drawn) {
	const writes = declaration.writes;
	const upsert = writes.includes("create") && writes.includes("update") ? ["upsert"] : [];
	const picked = new Set([...(declaration.reads ?? []), ...writes, ...writes.map((verb) => MANY_OF[verb]), ...upsert]);
	const unpicked = Object.keys(drawn).filter(
		(verb) => typeof drawn[verb] === "function" && verb !== "subscribe" && !picked.has(verb),
	);
	if (unpicked.length === 0) return drawn;
	const refused = unpicked.map((verb) => [
		verb,
		refusedVerb(drawn[verb], NOT_PICKED.replace("{name}", name).replaceAll("{verb}", verb)),
	]);
	return { ...drawn, ...Object.fromEntries(refused) };
}

function useValueDrawn(name, declaration, gateway) {
	const { data, failure } = useData(gateway.get);
	const value = useMemo(() => valueOrDefault(declaration, data), [data]);
	const update = useMemo(() => checkedValueUpdate(gateway.update, declaration, name), [gateway.update]);
	if (declaration.writes.length === 0) return { value, failure };
	const picked = { value, update, remove: gateway.remove };
	const verbs = [
		...(declaration.reads ?? ["get"]).map((verb) => (verb === "get" ? "value" : verb)),
		...declaration.writes,
	];
	return {
		value: Object.fromEntries(verbs.filter((verb) => verb in picked).map((verb) => [verb, picked[verb]])),
		failure,
	};
}

function valueOrDefault(declaration, held) {
	return held === null || held === undefined ? defaultOf(declaration) : held;
}

function gatewayOverGiven(name, declaration, given) {
	const held = given === undefined ? defaultOf(declaration) : given;
	const Default = defaultImplementationFor(declaredInterfaces.get(declaration), name);
	const made = new Default(declaration.kind === "collection" ? { rows: held ?? [] } : { value: held });
	return gatewayOverImplementation(name, declaration, made);
}

function isGateway(held) {
	return (
		typeof held === "object" &&
		held !== null &&
		typeof held.subscribe === "function" &&
		(held.kind === "collection" || held.kind === "value")
	);
}
