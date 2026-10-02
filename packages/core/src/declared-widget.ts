import { createElement as h, useMemo, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { z } from "zod";
import { defaultImplementationFor } from "./gateway/defaults";
import { refuseVerb } from "./gateway/create";
import { ENGINE_GATEWAY, gatewayOverImplementation, isImplementation } from "./gateway/adapted";
import type { AdaptedGateway } from "./gateway/adapted";
import { gatewayCache, stableKey } from "./gateway/cache";
import type { Action, CanResult, CollectionGateway, ValueGateway } from "./gateway/contract";
import { useData } from "./gateway/use-data";
import { declarationIn, defaultOf } from "./gateway/declared";
import type { DeclaredProps } from "./gateway/declared";
import type { CommandAnswer } from "./gateway/queries";
import type { Declaration } from "./gateway/declaration";
import { withManyVerbs } from "./gateway/many";
import type { EveryValueVerb } from "./gateway/needs";
import { checkCollectionWrites, checkValueUpdate } from "./gateway/parsed";
import { isObject } from "./engine/is-object.js";

const NOT_READ = "A prop could not be read";
const NOT_DECLARED = 'prop "{name}" declares no gateway interface';
const NOT_PICKED = 'prop "{name}" did not pick {verb}, so the widget cannot {verb}';
const NOT_SET_UP = '"{name}" is not set up: pick what runs it in the settings window';
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
	readonly gatewayId?: string;
}

type Runner = (input: unknown) => unknown;

const declaredInterfaces = new WeakMap<Declaration, unknown>();

const HANDED: Readonly<Partial<Record<Declaration["kind"], Hand>>> = {
	passed: (_name, declaration, given) =>
		declaration.passed === undefined ? null : (given[declaration.passed] ?? null),
	slot: (name, _declaration, given) => fieldOf(given["slots"], name) ?? given[name] ?? null,
	mounts: (name, _declaration, given) => fieldOf(given["mounts"], name) ?? given[name] ?? [],
};

export function createDeclaredWidget(props: DeclaredProps, draw: (drawn: DrawnProps) => ReactNode): InjectedWidget {
	const declared = Object.entries(props).map(([name, held]) => [name, declarationOfInterface(held)] as const);
	const reads = declared.filter(([, declaration]) => declaration?.kind !== "command");
	const commands = declared.filter(([, declaration]) => declaration?.kind === "command");
	function InjectedWidget(given: GivenProps): ReactNode {
		const drawn: Record<string, unknown> = {};
		const failures: string[] = [];
		const readIds: string[] = [];
		for (const [name, declaration] of reads) {
			const read = readOf(name, declaration, given);
			drawn[name] = read.value;
			if (read.gatewayId) readIds.push(read.gatewayId);
			if (read.failure) failures.push(`${name}: ${read.failure}`);
		}
		for (const [name, declaration] of commands) drawn[name] = useCommand(name, declaration, given[name], readIds);
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
	if (gateway.kind === "collection")
		return { value: useCollectionProp(name, declaration, gateway), failure: null, gatewayId: gateway.id };
	return { ...useValueProp(name, declaration, gateway), gatewayId: gateway.id };
}

function useCommand(
	name: string,
	declaration: Declaration | null,
	given: unknown,
	readIds: readonly string[],
): unknown {
	if (!declaration) throw new TypeError(NOT_DECLARED.replace("{name}", name));
	const readIdsNow = useRef(readIds);
	readIdsNow.current = readIds;
	return useMemo(() => commandOver(name, declaration, given, () => readIdsNow.current), [given]);
}

function commandOver(
	name: string,
	declaration: Declaration,
	given: unknown,
	readIdsNow: () => readonly string[],
): Action<unknown, CommandAnswer> {
	const runner = runnerOf(given);
	const can = (): CanResult => {
		if (!runner) return { can: false, reason: NOT_SET_UP.replace("{name}", name) };
		const asked: unknown = isObject(given) ? given["can"] : undefined;
		return typeof asked === "function" ? Reflect.apply(asked, given, []) : { can: true };
	};
	const run = async (input: unknown): Promise<CommandAnswer> => {
		const allowed = can();
		if (!allowed.can) return { ok: false, reason: allowed.reason };
		const parsed = declaration.schema.safeParse(input);
		if (!parsed.success) return { ok: false, reason: z.prettifyError(parsed.error) };
		try {
			await runner?.(parsed.data);
		} catch (failure: unknown) {
			console.error(`Widgetarium: command "${name}" failed`, failure);
			return { ok: false, reason: failure instanceof Error ? failure.message : String(failure) };
		}
		await gatewayCache.refetch(readIdsNow());
		return { ok: true };
	};
	return Object.assign(run, { can });
}

function runnerOf(given: unknown): Runner | null {
	if (!isObject(given)) return null;
	const run: unknown = given["run"];
	return typeof run === "function" ? (input) => Reflect.apply(run, given, [input]) : null;
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

function useCollectionProp(name: string, declaration: Declaration, gateway: CollectionGateway<unknown>): unknown {
	return useMemo(() => {
		if (declaration.isQuery) return gateway.list;
		return keepOnlyPicked(name, declaration, withManyVerbs({ ...checkCollectionWrites(gateway, declaration, name) }));
	}, [gateway]);
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
