import { createElement as h, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { defaultImplementationFor } from "./gateway/defaults";
import { refuseVerb } from "./gateway/create";
import { ENGINE_GATEWAY, gatewayOverImplementation, isImplementation } from "./gateway/adapted";
import type { AdaptedGateway } from "./gateway/adapted";
import { stableKey } from "./gateway/cache";
import type { CollectionGateway, ValueGateway } from "./gateway/contract";
import { useData } from "./gateway/use-data";
import { declarationIn, defaultOf } from "./gateway/declared";
import type { DeclaredProps } from "./gateway/declared";
import type { Declaration } from "./gateway/declaration";
import { withManyVerbs } from "./gateway/many";
import type { EveryValueVerb } from "./gateway/needs";
import { checkCollectionWrites, checkValueUpdate } from "./gateway/parsed";
import { isObject } from "./engine/is-object.js";

const NOT_READ = "A prop could not be read";
const NOT_DECLARED = 'prop "{name}" declares no gateway interface';
const NOT_PICKED = 'prop "{name}" did not pick {verb}, so the widget cannot {verb}';
const MANY_OF: Readonly<Record<string, string>> = { create: "createMany", update: "updateMany", remove: "removeMany" };

export type GivenProps = Readonly<Record<string, unknown>>;
export type DrawnProps = Readonly<Record<string, unknown>>;

export interface InjectedWidget {
	(given: GivenProps): ReactNode;
	readonly declared: DeclaredProps;
}

type ValueHeldGateway = ValueGateway<unknown, EveryValueVerb>;
type Hand = (name: string, declaration: Declaration, given: GivenProps) => unknown;

interface PropRead {
	readonly value: unknown;
	readonly failure: string | null;
}

const declaredInterfaces = new WeakMap<Declaration, unknown>();

const HANDED: Readonly<Partial<Record<Declaration["kind"], Hand>>> = {
	passed: (_name, declaration, given) =>
		declaration.passed === undefined ? null : (given[declaration.passed] ?? null),
	slot: (name, _declaration, given) => fieldOf(given["slots"], name) ?? given[name] ?? null,
	mounts: (name, _declaration, given) => fieldOf(given["mounts"], name) ?? given[name] ?? [],
};

export function createDeclaredWidget(props: DeclaredProps, draw: (drawn: DrawnProps) => ReactNode): InjectedWidget {
	const declared = Object.entries(props).map(([name, held]) => [name, declarationOfInterface(held)] as const);
	function InjectedWidget(given: GivenProps): ReactNode {
		const drawn: Record<string, unknown> = {};
		const failures: string[] = [];
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

function declarationOfInterface(held: unknown): Declaration | null {
	const declaration = declarationIn(held);
	if (declaration) declaredInterfaces.set(declaration, held);
	return declaration;
}

function readOf(name: string, declaration: Declaration | null, given: GivenProps): PropRead {
	if (!declaration) throw new TypeError(NOT_DECLARED.replace("{name}", name));
	const hand = HANDED[declaration.kind];
	if (hand) return { value: hand(name, declaration, given), failure: null };
	return useProp(name, declaration, given[name]);
}

function notReadNotice(failures: readonly string[]): ReactElement {
	return h("div", { className: "wg-error" }, [
		h("b", { key: "what" }, NOT_READ),
		...failures.map((said) => h("code", { key: said }, said)),
	]);
}

function useProp(name: string, declaration: Declaration, given: unknown): PropRead {
	const gateway = useGateway(name, declaration, given);
	if (gateway.kind === "collection") return { value: useCollectionProp(name, declaration, gateway), failure: null };
	return useValueProp(name, declaration, gateway);
}

function useGateway(name: string, declaration: Declaration, given: unknown): AdaptedGateway {
	const isPlain = !isGateway(given) && !isImplementation(declaration, given);
	return useMemo(() => gatewayOver(name, declaration, given), [isPlain ? stableKey(given) : given]);
}

function gatewayOver(name: string, declaration: Declaration, given: unknown): AdaptedGateway {
	if (isGateway(given)) return given;
	if (isImplementation(declaration, given))
		return engineGatewayOf(given) ?? gatewayOverImplementation(name, declaration, given);
	return gatewayOverGiven(name, declaration, given);
}

function useCollectionProp(name: string, declaration: Declaration, gateway: CollectionGateway<unknown>): object {
	return useMemo(
		() => keepOnlyPicked(name, declaration, withManyVerbs({ ...checkCollectionWrites(gateway, declaration, name) })),
		[gateway],
	);
}

function keepOnlyPicked(name: string, declaration: Declaration, drawn: object): object {
	const writes = declaration.writes;
	const upsert = writes.includes("create") && writes.includes("update") ? ["upsert"] : [];
	const manyWrites = writes.map((verb) => MANY_OF[verb]).filter((verb): verb is string => verb !== undefined);
	const picked = new Set([...(declaration.reads ?? []), ...writes, ...manyWrites, ...upsert]);
	const unpicked = Object.keys(drawn).filter(
		(verb) => typeof verbIn(drawn, verb) === "function" && verb !== "subscribe" && !picked.has(verb),
	);
	if (unpicked.length === 0) return drawn;
	const refused = unpicked.map(
		(verb) =>
			[verb, refuseVerb(verbIn(drawn, verb), NOT_PICKED.replace("{name}", name).split("{verb}").join(verb))] as const,
	);
	return { ...drawn, ...Object.fromEntries(refused) };
}

function useValueProp(name: string, declaration: Declaration, gateway: ValueHeldGateway): PropRead {
	const { data, failure } = useData(gateway.get);
	const value = useMemo(() => valueOrDefault(declaration, data), [data]);
	const update = useMemo(() => checkValueUpdate(gateway.update, declaration, name), [gateway.update]);
	if (declaration.writes.length === 0) return { value, failure };
	const picked: Readonly<Record<string, unknown>> = { value, update, remove: gateway.remove };
	const verbs = [
		...(declaration.reads ?? ["get"]).map((verb) => (verb === "get" ? "value" : verb)),
		...declaration.writes,
	];
	return {
		value: Object.fromEntries(verbs.filter((verb) => verb in picked).map((verb) => [verb, picked[verb]] as const)),
		failure,
	};
}

function valueOrDefault(declaration: Declaration, held: unknown): unknown {
	return held === null || held === undefined ? defaultOf(declaration) : held;
}

function gatewayOverGiven(name: string, declaration: Declaration, given: unknown): AdaptedGateway {
	const held = given === undefined ? defaultOf(declaration) : given;
	const Default = defaultImplementationFor(declaredInterfaces.get(declaration), name);
	const made = new Default(declaration.kind === "collection" ? { rows: held ?? [] } : { value: held });
	return gatewayOverImplementation(name, declaration, made);
}

function engineGatewayOf(given: object): AdaptedGateway | null {
	const engine: unknown = Reflect.get(given, ENGINE_GATEWAY);
	return isGateway(engine) ? engine : null;
}

function isGateway(held: unknown): held is AdaptedGateway {
	return (
		isObject(held) &&
		typeof held["subscribe"] === "function" &&
		(held["kind"] === "collection" || held["kind"] === "value")
	);
}

function verbIn(drawn: object, verb: string): unknown {
	return Reflect.get(drawn, verb);
}

function fieldOf(held: unknown, key: string): unknown {
	return isObject(held) ? held[key] : undefined;
}
