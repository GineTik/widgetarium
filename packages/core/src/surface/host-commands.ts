import { useMemo } from "react";
import type { GatewayRefs } from "../gateway/refs.js";
import type { EngineManifest } from "../engine/catalogue-index.js";
import type { Tile } from "../model.js";
import { canOf } from "../gateway/create.js";
import { AnsweringCommand, runHandler } from "../gateway/run-handler.js";
import { declarationIn } from "../gateway/declaration.js";
import { handlerContextOf } from "../gateway/handler-context.js";
import { useSignalUntilUnmount } from "../gateway/use-signal-until-unmount.js";
import { portsOf, registeredCommands } from "../engine/packs.js";
import type { PortsHost } from "../engine/packs.js";
import type { CommandMetadata } from "../gateway/implementation-metadata.js";
import { commandBindingOf, commandSpecsOf, isRunAllowed, targetOf } from "./command-binding.js";
import type { CommandBinding } from "./command-binding.js";

type DescribedRefs = Pick<GatewayRefs, "described">;

interface CommandAsk {
	readonly name: string;
	readonly binding: CommandBinding;
	readonly refs: GatewayRefs;
	readonly tileId: string;
	readonly host: PortsHost;
	readonly signal: AbortSignal;
}

interface TileCommandsAsk extends Pick<CommandAsk, "refs" | "host" | "signal"> {
	readonly tile: Tile;
}

type CommandSpecs = ReturnType<typeof commandSpecsOf>;

const NOT_ALLOWED = '"{name}" is switched off for this tile';
const VAULT_NOT_SWITCHED_ON = '"{name}" writes the vault, which stays shut until it is switched on in the Data tab';
const PACK_NOT_SWITCHED_ON = '"{name}" runs {title}, which stays shut until it is switched on in the Data tab';
const UNKNOWN_IMPLEMENTATION = '"{name}" names {implementation}, which this host does not run';

export function useHostCommands(
	manifest: EngineManifest,
	tile: Tile,
	refs: GatewayRefs,
	host: PortsHost,
): Record<string, AnsweringCommand> {
	const specs = commandSpecsOf(manifest["commands"]);
	const signal = useSignalUntilUnmount();
	return useMemo(
		() => hostCommandsOf(specs, { tile, refs, host, signal }),
		[tile.props, refs, host, signal, Object.keys(specs).join("\u0000")],
	);
}

export function isConsentNeededFor(binding: CommandBinding, refs: DescribedRefs): boolean {
	const packed = commandOf(binding.implementation);
	return packed ? isConsentNeeded(packed, binding, refs) : false;
}

function hostCommandsOf(specs: CommandSpecs, { tile, ...asked }: TileCommandsAsk): Record<string, AnsweringCommand> {
	return Object.fromEntries(
		Object.entries(specs).flatMap(([name, spec]) => {
			const binding = commandBindingOf(tile, name, spec);
			const command = hostCommandOf({ ...asked, name, binding, tileId: tile.id });
			return command ? [[name, command] as const] : [];
		}),
	);
}

function isConsentNeeded(packed: CommandMetadata, binding: CommandBinding, refs: DescribedRefs): boolean {
	if (packed.consent === "free") return false;
	if (packed.consent === "always") return true;
	const target = targetOf(binding);
	return target ? refs.described(target)?.isVault === true : false;
}

function hostCommandOf(ask: CommandAsk): AnsweringCommand | null {
	const { name, binding } = ask;
	const { implementation } = binding;
	if (binding.allow && !binding.allow.includes("run")) return createRefusedCommand(NOT_ALLOWED.replace("{name}", name));
	if (!implementation) return null;
	const packed = commandOf(implementation);
	if (!packed)
		return createRefusedCommand(
			UNKNOWN_IMPLEMENTATION.replace("{name}", name).replace("{implementation}", implementation),
		);
	if (!isRunAllowed(binding, isConsentNeeded(packed, binding, ask.refs)))
		return createRefusedCommand(shutReasonOf(name, packed));
	return createPackedCommand(packed, ask);
}

function createPackedCommand(
	packed: CommandMetadata,
	{ name, binding, refs, tileId, host, signal }: CommandAsk,
): AnsweringCommand {
	const ports = portsOf(host, refs, `${tileId}/${name}`);
	const instance: object = Reflect.construct(packed.implementation, [binding.fields ?? {}, ports]);
	const contract = { output: declarationIn(packed.implementation)?.output, name: packed.id };
	const context = handlerContextOf(ports, signal);
	return new AnsweringCommand(
		() => canOf(instance),
		(input) => runHandler(instance, input, contract, context),
	);
}

function commandOf(implementation: string | undefined): CommandMetadata | undefined {
	return registeredCommands().find((entry) => entry.id === implementation);
}

function shutReasonOf(name: string, packed: CommandMetadata): string {
	if (packed.consent === "vault-target") return VAULT_NOT_SWITCHED_ON.replace("{name}", name);
	return PACK_NOT_SWITCHED_ON.replace("{name}", name).replace("{title}", packed.title);
}

function createRefusedCommand(reason: string): AnsweringCommand {
	return new AnsweringCommand(
		() => ({ can: false, reason }),
		() => Promise.resolve({ ok: false, reason, ran: false }),
	);
}
