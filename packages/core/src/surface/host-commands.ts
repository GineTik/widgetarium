import { useMemo } from "react";
import type { CanResult } from "../gateway/contract";
import type { GatewayRefs } from "../gateway/refs.js";
import { isObject } from "../engine/is-object.js";
import type { EngineManifest } from "../engine/catalogue-index.js";
import type { Tile } from "../model.js";
import { canOf } from "../gateway/create.js";
import {
	CONSOLE_LOG,
	HOST_COMMAND_KINDS,
	commandBindingOf,
	commandSpecsOf,
	isRunAllowed,
	targetOf,
} from "./command-binding.js";
import type { CommandBinding } from "./command-binding.js";
import { portsOf, registeredCommands } from "../engine/packs.js";
import type { ImplementationPorts, PortsHost } from "../engine/packs.js";
import type { CommandMetadata } from "../gateway/implementation-metadata.js";

export interface HostCommand {
	run(input: unknown): Promise<void>;
	can(): CanResult;
}

type Verbs = Readonly<Record<string, unknown>>;

type Write = (verbs: Verbs, input: unknown) => Promise<unknown>;

type Decision = { readonly can: true; readonly verbs: Verbs } | { readonly can: false; readonly reason: string };

interface TargetedAsk {
	readonly name: string;
	readonly verb: string;
	readonly write: Write;
	readonly target: string;
	readonly refs: GatewayRefs;
	readonly binding: CommandBinding;
}

const NOT_ALLOWED = '"{name}" is switched off for this tile';
const PACK_NOT_SWITCHED_ON = '"{name}" runs {title}, which stays shut until it is switched on in the Data tab';
const RUNS_NOTHING = "{implementation} has no run";
const VAULT_NOT_SWITCHED_ON = '"{name}" writes the vault, which stays shut until it is switched on in the Data tab';
const UNKNOWN_IMPLEMENTATION = '"{name}" names {implementation}, which this host does not run';
const NOTHING_NAMED = '"{name}" names nothing to change: pick it in the settings window';
const TARGET_GONE = '"{name}" changes {ref}, which is no longer on this board';
const TARGET_CANNOT = "{ref} cannot {verb}";

const WRITES: Readonly<Record<string, Write>> = {
	"@core/rows-create": createRow,
	"@core/rows-update": updateRow,
	"@core/rows-remove": removeRow,
	"@core/rows-replace": (verbs, input) => call(verbs, "replace", input),
	"@core/rows-repair-ids": (verbs) => call(verbs, "repairIds", undefined),
	"@core/value-set": (verbs, input) => call(verbs, "update", input),
};

const RUNNING_ON_TARGET = new Map<string, Promise<unknown>>();

interface CommandAsk {
	readonly name: string;
	readonly binding: CommandBinding;
	readonly refs: GatewayRefs;
	readonly tileId: string;
	readonly host: PortsHost;
}

export function useHostCommands(
	manifest: EngineManifest,
	tile: Tile,
	refs: GatewayRefs,
	host: PortsHost,
): Record<string, HostCommand> {
	const specs = commandSpecsOf(manifest["commands"]);
	return useMemo(
		() =>
			Object.fromEntries(
				Object.entries(specs).flatMap(([name, spec]) => {
					const binding = commandBindingOf(tile, name, spec);
					const command = hostCommandOf({ name, binding, refs, tileId: tile.id, host });
					return command ? [[name, command] as const] : [];
				}),
			),
		[tile.props, refs, host, Object.keys(specs).join("\u0000")],
	);
}

function hostCommandOf({ name, binding, refs, tileId, host }: CommandAsk): HostCommand | null {
	const { implementation } = binding;
	if (binding.allow && !binding.allow.includes("run")) return createRefusedCommand(NOT_ALLOWED.replace("{name}", name));
	if (!implementation) return null;
	if (implementation === CONSOLE_LOG) return createConsoleLogCommand(`${tileId}/${name}`);
	const packed = registeredCommands().find((entry) => entry.id === implementation);
	if (packed) return createPackCommand(name, packed, binding, portsOf(host, refs));
	const kind = HOST_COMMAND_KINDS[implementation];
	const write = WRITES[implementation];
	if (!kind || !write)
		return createRefusedCommand(
			UNKNOWN_IMPLEMENTATION.replace("{name}", name).replace("{implementation}", implementation),
		);
	const target = targetOf(binding);
	if (!target) return createRefusedCommand(NOTHING_NAMED.replace("{name}", name));
	return createTargetedCommand({ name, verb: kind.verb, write, target, refs, binding });
}

function createTargetedCommand(ask: TargetedAsk): HostCommand {
	return {
		can: () => {
			const decided = decisionOf(ask);
			return decided.can ? { can: true } : decided;
		},
		run: (input) => runAfterOthersOnTarget(ask.target, () => writeWhenDecided(ask, input)),
	};
}

async function writeWhenDecided(ask: TargetedAsk, input: unknown): Promise<void> {
	const decided = decisionOf(ask);
	if (!decided.can) throw new Error(decided.reason);
	await ask.write(decided.verbs, input);
}

function decisionOf({ name, verb, target, refs, binding }: TargetedAsk): Decision {
	const verbs: unknown = refs.get(target);
	if (!isObject(verbs)) return { can: false, reason: TARGET_GONE.replace("{name}", name).replace("{ref}", target) };
	if (!isRunAllowed(binding, refs.described(target)?.isVault === true))
		return { can: false, reason: VAULT_NOT_SWITCHED_ON.replace("{name}", name) };
	if (typeof verbs[verb] !== "function") return { can: false, reason: cannot(target, verb) };
	const asked = canOf(verbs[verb]);
	return asked.can ? { can: true, verbs } : asked;
}

function runAfterOthersOnTarget(target: string, run: () => Promise<void>): Promise<void> {
	const before = RUNNING_ON_TARGET.get(target) ?? Promise.resolve();
	const next = before.then(run, run);
	RUNNING_ON_TARGET.set(target, next);
	return next.finally(() => {
		if (RUNNING_ON_TARGET.get(target) === next) RUNNING_ON_TARGET.delete(target);
	});
}

function createConsoleLogCommand(ref: string): HostCommand {
	return {
		can: () => ({ can: true }),
		run: async (input) => {
			console.log(`[widgetarium] ${ref} sent`, input);
		},
	};
}

function createPackCommand(
	name: string,
	packed: CommandMetadata,
	binding: CommandBinding,
	ports: ImplementationPorts,
): HostCommand {
	if (!isRunAllowed(binding, true))
		return createRefusedCommand(PACK_NOT_SWITCHED_ON.replace("{name}", name).replace("{title}", packed.title));
	const instance: object = Reflect.construct(packed.implementation, [binding.fields ?? {}, ports]);
	return {
		can: () => canOf(instance),
		run: async (input) => {
			const run: unknown = Reflect.get(instance, "run");
			if (typeof run !== "function") throw new Error(RUNS_NOTHING.replace("{implementation}", packed.id));
			await Reflect.apply(run, instance, [input]);
		},
	};
}

function createRefusedCommand(reason: string): HostCommand {
	return {
		can: () => ({ can: false, reason }),
		run: () => Promise.reject(new Error(reason)),
	};
}

async function createRow(verbs: Verbs, input: unknown): Promise<unknown> {
	const id = isObject(input) ? input["id"] : undefined;
	if (typeof id !== "string" || id === "") return call(verbs, "create", input);
	const listed: unknown = await call(verbs, "list", { where: [{ prop: "id", op: "is", value: id }], limit: 1 });
	const held = isObject(listed) && Array.isArray(listed["rows"]) ? listed["rows"].length : 0;
	return held > 0 ? null : call(verbs, "create", input);
}

function updateRow(verbs: Verbs, input: unknown): Promise<unknown> {
	if (!isObject(input) || typeof input["ref"] !== "string")
		return Promise.reject(new Error(cannot("this row", "update")));
	const { ref, ...data } = input;
	return call(verbs, "update", { ref, data });
}

function removeRow(verbs: Verbs, input: unknown): Promise<unknown> {
	const ref = isObject(input) ? input["ref"] : input;
	if (typeof ref !== "string") return Promise.reject(new Error(cannot("this row", "remove")));
	return call(verbs, "remove", ref);
}

function call(verbs: Verbs, verb: string, input: unknown): Promise<unknown> {
	const held = verbs[verb];
	if (typeof held !== "function") return Promise.reject(new Error(cannot("the list", verb)));
	return Promise.resolve(Reflect.apply(held, verbs, [input]));
}

function cannot(ref: string, verb: string): string {
	return TARGET_CANNOT.replace("{ref}", ref).replace("{verb}", verb);
}
