import { useMemo } from "react";
import type { CanResult } from "../gateway/contract";
import type { GatewayRefs } from "../gateway/refs.js";
import type { EngineManifest } from "../engine/catalogue-index.js";
import type { Tile } from "../model.js";
import { canOf } from "../gateway/create.js";
import { portsOf, registeredCommands } from "../engine/packs.js";
import type { PortsHost } from "../engine/packs.js";
import type { CommandMetadata } from "../gateway/implementation-metadata.js";
import { commandBindingOf, commandSpecsOf, isRunAllowed, targetOf } from "./command-binding.js";
import type { CommandBinding } from "./command-binding.js";

export interface HostCommand {
	run(input: unknown): Promise<void>;
	can(): CanResult;
}

type DescribedRefs = Pick<GatewayRefs, "described">;

interface CommandAsk {
	readonly name: string;
	readonly binding: CommandBinding;
	readonly refs: GatewayRefs;
	readonly tileId: string;
	readonly host: PortsHost;
}

const NOT_ALLOWED = '"{name}" is switched off for this tile';
const VAULT_NOT_SWITCHED_ON = '"{name}" writes the vault, which stays shut until it is switched on in the Data tab';
const PACK_NOT_SWITCHED_ON = '"{name}" runs {title}, which stays shut until it is switched on in the Data tab';
const UNKNOWN_IMPLEMENTATION = '"{name}" names {implementation}, which this host does not run';
const RUNS_NOTHING = "{implementation} has no run";

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

export function isConsentNeededFor(binding: CommandBinding, refs: DescribedRefs): boolean {
	const packed = commandOf(binding.implementation);
	return packed ? isConsentNeeded(packed, binding, refs) : false;
}

function isConsentNeeded(packed: CommandMetadata, binding: CommandBinding, refs: DescribedRefs): boolean {
	if (packed.consent === "free") return false;
	if (packed.consent === "always") return true;
	const target = targetOf(binding);
	return target ? refs.described(target)?.isVault === true : false;
}

function hostCommandOf({ name, binding, refs, tileId, host }: CommandAsk): HostCommand | null {
	const { implementation } = binding;
	if (binding.allow && !binding.allow.includes("run")) return createRefusedCommand(NOT_ALLOWED.replace("{name}", name));
	if (!implementation) return null;
	const packed = commandOf(implementation);
	if (!packed)
		return createRefusedCommand(
			UNKNOWN_IMPLEMENTATION.replace("{name}", name).replace("{implementation}", implementation),
		);
	if (!isRunAllowed(binding, isConsentNeeded(packed, binding, refs)))
		return createRefusedCommand(shutReasonOf(name, packed));
	const ports = portsOf(host, refs, `${tileId}/${name}`);
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

function commandOf(implementation: string | undefined): CommandMetadata | undefined {
	return registeredCommands().find((entry) => entry.id === implementation);
}

function shutReasonOf(name: string, packed: CommandMetadata): string {
	if (packed.consent === "vault-target") return VAULT_NOT_SWITCHED_ON.replace("{name}", name);
	return PACK_NOT_SWITCHED_ON.replace("{name}", name).replace("{title}", packed.title);
}

function createRefusedCommand(reason: string): HostCommand {
	return {
		can: () => ({ can: false, reason }),
		run: () => Promise.reject(new Error(reason)),
	};
}
