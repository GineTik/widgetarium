import type { CommandMetadata, GatewayMetadata } from "../gateway/implementation-metadata.js";

export interface CommandLineOutcome {
	readonly ok: boolean;
	readonly output: string;
	readonly failure: string | null;
}

export interface CommandLinePort {
	readonly can: boolean;
	run(file: string, args: readonly string[], cwd?: string): Promise<CommandLineOutcome>;
}

export interface RefsPort {
	read(ref: string): Promise<unknown>;
	watch(refs: string[], changed: () => void): () => void;
}

export interface ImplementationPorts {
	readonly commandLine: CommandLinePort;
	readonly workingDirectory: string | undefined;
	readonly refs: RefsPort;
}

export interface Pack {
	readonly id: string;
	readonly title: string;
	readonly queries: readonly GatewayMetadata[];
	readonly commands: readonly CommandMetadata[];
}

const OUTSIDE_THE_PACK = '{id} is not named under its pack "{pack}": name it "{pack}/…"';

const NO_COMMAND_LINE: CommandLinePort = {
	can: false,
	run: async () => ({ ok: false, output: "", failure: "no command line on this host" }),
};

const REGISTERED = new Map<string, Pack>();

export function definePack(pack: Pack): Pack {
	const ids = [...pack.queries, ...pack.commands].map((entry) => entry.id);
	const outside = ids.find((id) => !id.startsWith(`${pack.id}/`));
	if (outside) throw new Error(OUTSIDE_THE_PACK.replace("{id}", outside).split("{pack}").join(pack.id));
	return pack;
}

export function registerPacks(...packs: readonly Pack[]): void {
	for (const pack of packs) REGISTERED.set(pack.id, pack);
}

export function registeredQueries(): GatewayMetadata[] {
	return [...REGISTERED.values()].flatMap((pack) => pack.queries);
}

export function registeredCommands(): CommandMetadata[] {
	return [...REGISTERED.values()].flatMap((pack) => pack.commands);
}

export interface PortsHost {
	readonly commandLine?: CommandLinePort | undefined;
	readonly workingDirectory?: string | undefined;
}

export function portsOf(host: PortsHost, refs: RefsPort): ImplementationPorts {
	return { commandLine: host.commandLine ?? NO_COMMAND_LINE, workingDirectory: host.workingDirectory, refs };
}
