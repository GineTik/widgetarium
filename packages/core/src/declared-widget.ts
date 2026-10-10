import { createElement as h, useCallback, useMemo, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { z } from "zod";
import { defaultImplementationFor } from "./gateway/defaults";
import { canOf, refuseVerb } from "./gateway/create";
import { gatewayOverImplementation, isImplementation } from "./gateway/adapted";
import type { AdaptedGateway } from "./gateway/adapted";
import { gatewayCache, stableKey } from "./gateway/cache";
import type { Action, CanResult, CollectionGateway, Query, ValueGateway } from "./gateway/contract";
import { useData } from "./gateway/use-data";
import { declarationIn, defaultOf } from "./gateway/declared";
import type { DeclaredProps } from "./gateway/declared";
import { AnsweringCommand, answerAfterRun, fitOutput, runHandler } from "./gateway/run-handler";
import type { CommandAnswer, HandlerContract } from "./gateway/run-handler";
import { classNameOf } from "./gateway/declaration";
import type { Declaration } from "./gateway/declaration";
import { withManyVerbs } from "./gateway/many";
import type { EveryValueVerb } from "./gateway/needs";
import { checkCollectionWrites, checkValueUpdate } from "./gateway/parsed";
import { askedReadOf } from "./gateway/asked-read";
import type { AskedRead, AskedShape } from "./gateway/asked-read";
import { shutHostFor } from "./gateway/handler-context";
import type { HandlerContext } from "./gateway/handler-context";
import { useHandlerContext } from "./gateway/use-signal-until-unmount";
import { isObject } from "./engine/is-object.js";
import { useSlotsOf } from "./slot-components.js";
import type { MountEntry } from "./gateway/host.js";

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
	readonly gatewayId?: string;
}

interface DeclaredCommand {
	readonly name: string;
	readonly declaration: Declaration;
	readonly given: unknown;
	readonly readGatewayIdsNow: () => readonly string[];
	readonly context: HandlerContext;
}

const declaredInterfaces = new WeakMap<Declaration, unknown>();

const HANDED: Readonly<Partial<Record<Declaration["kind"], Hand>>> = {
	passed: (_name, declaration, given) =>
		declaration.passed === undefined ? null : (given[declaration.passed] ?? null),
	slot: (name, _declaration, given) => fieldOf(given["slots"], name) ?? given[name] ?? null,
};

export function createDeclaredWidget(props: DeclaredProps, draw: (drawn: DrawnProps) => ReactNode): InjectedWidget {
	const declared = Object.entries(props).map(([name, held]) => [name, declarationOfInterface(held)] as const);
	const reads = declared.filter(([, declaration]) => declaration?.kind !== "command");
	const commands = declared.filter((entry): entry is readonly [string, Declaration] => entry[1]?.kind === "command");
	function DrawnWidget({ drawn }: { readonly drawn: DrawnProps }): ReactNode {
		return draw(drawn);
	}
	function InjectedWidget(given: GivenProps): ReactNode {
		const drawn: Record<string, unknown> = {};
		const failures: string[] = [];
		const readGatewayIds: string[] = [];
		for (const [name, declaration] of reads) {
			const read = readOf(name, declaration, given);
			drawn[name] = read.value;
			if (read.gatewayId) readGatewayIds.push(read.gatewayId);
			if (read.failure) failures.push(`${name}: ${read.failure}`);
		}
		for (const [name, declaration] of commands)
			drawn[name] = useCommandOver(name, declaration, given[name], readGatewayIds);
		if (failures.length > 0) return notReadNotice(failures);
		return h(DrawnWidget, { drawn });
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
	if (declaration.kind === "mounts")
		return {
			value: useSlotsOf(entriesOf(fieldOf(given["mounts"], name) ?? given[name]), declaration.held?.single === true),
			failure: null,
		};
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
	const { input, output } = declaration;
	if (input && output)
		return { value: useAskedRead(name, { input, output }, gateway), failure: null, gatewayId: gateway.id };
	if (gateway.kind === "collection")
		return { value: useCollectionProp(name, declaration, gateway), failure: null, gatewayId: gateway.id };
	return { ...useValueProp(name, declaration, gateway), gatewayId: gateway.id };
}

function useAskedRead(name: string, shape: AskedShape, gateway: AdaptedGateway): AskedRead {
	return useMemo(() => askedReadOf(name, shape, gateway), [gateway]);
}

function useCommandOver(
	name: string,
	declaration: Declaration,
	given: unknown,
	readGatewayIds: readonly string[],
): Action<unknown, CommandAnswer<unknown>> {
	const readGatewayIdsNow = useReaderOfLatest(readGatewayIds);
	const context = useShutHostContext(name);
	return useMemo(() => commandOver({ name, declaration, given, readGatewayIdsNow, context }), [given, context]);
}

function useReaderOfLatest<T>(held: T): () => T {
	const latest = useRef(held);
	latest.current = held;
	return useCallback(() => latest.current, []);
}

function useShutHostContext(name: string): HandlerContext {
	const host = useMemo(() => shutHostFor(name), [name]);
	return useHandlerContext(host);
}

function commandOver(command: DeclaredCommand): Action<unknown, CommandAnswer<unknown>> {
	const run = (input: unknown) => runDeclaredCommand(command, input);
	return Object.assign(run, { can: () => canOfGiven(command.given) });
}

function canOfGiven(given: unknown): CanResult {
	return given === undefined ? { can: true } : canOf(given);
}

async function runDeclaredCommand(command: DeclaredCommand, input: unknown): Promise<CommandAnswer<unknown>> {
	const { name, declaration, given } = command;
	const allowed = canOfGiven(given);
	if (!allowed.can) return { ok: false, reason: allowed.reason, ran: false };
	const fitted = fitOutput(declaration.schema, input);
	if (!fitted.ok) return { ...fitted, ran: false };
	const answered = await runToAnswer(command, fitted.output);
	if (answered.ok || answered.ran) await gatewayCache.refetch(command.readGatewayIdsNow());
	if (!answered.ok) return answered;
	return answerAfterRun(name, declaration.output, answered.output);
}

function runToAnswer({ name, given, context }: DeclaredCommand, input: unknown): Promise<CommandAnswer<unknown>> {
	if (given instanceof AnsweringCommand) return given.run(input);
	if (typeof given === "function") return runHandler({ run: given }, input, { output: z.unknown(), name }, context);
	if (isObject(given) && typeof given["run"] === "function")
		return runHandler(given, input, handlerContractOf(given), context);
	console.log(`[widgetarium] ${name} sent`, input);
	return Promise.resolve({ ok: true, output: undefined });
}

function handlerContractOf(handler: object): HandlerContract {
	const handlerClass: unknown = Reflect.get(handler, "constructor");
	const declaration = declarationIn(handlerClass);
	return { output: declaration ? declaration.output : z.unknown(), name: classNameOf(handlerClass) };
}

function useGateway(name: string, declaration: Declaration, given: unknown): AdaptedGateway {
	const isPlain = !isGateway(given) && !isImplementation(declaration, given);
	return useMemo(() => gatewayOver(name, declaration, given), [isPlain ? stableKey(given) : given]);
}

function gatewayOver(name: string, declaration: Declaration, given: unknown): AdaptedGateway {
	if (isGateway(given)) return given;
	if (isImplementation(declaration, given))
		return gatewayOverImplementation(name, declaration, given, { host: shutHostFor(name) });
	return gatewayOverGiven(name, declaration, given);
}

function queryReadOf(gateway: CollectionGateway<unknown>): unknown {
	const { list, get } = gateway;
	return Object.assign((input?: Query) => list(input), {
		can: () => list.can(),
		meta: Reflect.get(list, "meta"),
		get,
	});
}

function useCollectionProp(name: string, declaration: Declaration, gateway: CollectionGateway<unknown>): unknown {
	return useMemo(() => {
		if (declaration.isQuery) return queryReadOf(gateway);
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
	return gatewayOverImplementation(name, declaration, made, { host: shutHostFor(name) });
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

function entriesOf(held: unknown): readonly MountEntry[] {
	return Array.isArray(held) ? held.filter(isMountEntry) : [];
}

function isMountEntry(held: unknown): held is MountEntry {
	return isObject(held) && typeof held["name"] === "string";
}
