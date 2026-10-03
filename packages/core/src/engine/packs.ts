import type { FilterRow, SortRow } from "../gateway/contract.js";
import type { CommandMetadata, GatewayMetadata } from "../gateway/implementation-metadata.js";
import type { FileHost, FolderHost, VaultSlot } from "../gateway/obsidian.js";
import type { NeedOfField } from "../gateway/props.js";
import type { RefDescription, ViewCell } from "../gateway/refs.js";
import { NO_CATALOGUE_PORT } from "./catalogue-port.js";
import type { CataloguePort } from "./catalogue-port.js";

export interface CommandLineOutcome {
	readonly ok: boolean;
	readonly output: string;
	readonly failure: string | null;
}

export interface CommandLinePort {
	readonly can: boolean;
	run(file: string, args: readonly string[], cwd?: string): Promise<CommandLineOutcome>;
}

export interface NetworkAnswer {
	readonly status: number;
	readonly text: string;
}

export interface NetworkAsk {
	readonly method?: string;
	readonly body?: string;
	readonly headers?: Readonly<Record<string, string>>;
}

export interface NetworkPort {
	readonly can: boolean;
	request(url: string, ask: NetworkAsk): Promise<NetworkAnswer>;
}

export interface VaultNote {
	readonly path: string;
	readonly name: string;
	readonly props: Readonly<Record<string, unknown>>;
}

export interface VaultPort {
	readonly can: boolean;
	folder(path: string): VaultSlot;
	notesTagged(tag: string): Promise<readonly VaultNote[]>;
	notesMatching(text: string): Promise<readonly VaultNote[]>;
	open(path: string): void;
}

export interface RefsPort {
	read(ref: string): Promise<unknown>;
	watch(refs: string[], changed: () => void): () => void;
	get(ref: string): unknown;
	described(ref: string): RefDescription | null;
}

export interface ImplementationPorts {
	readonly self: string;
	readonly commandLine: CommandLinePort;
	readonly workingDirectory: string | undefined;
	readonly network: NetworkPort;
	readonly vault: VaultPort;
	readonly refs: RefsPort;
	readonly catalogue: CataloguePort;
	confirm(said: string): Promise<boolean>;
}

export interface PropPort {
	readonly kind: "value" | "collection" | null;
	readonly type: string | undefined;
	readonly writes: readonly string[];
	readonly declared: unknown;
	readonly where: readonly FilterRow[];
	readonly sort: readonly SortRow[];
	readonly needs: Readonly<Record<string, NeedOfField>>;
	readonly isDeclaredSource: boolean;
}

export interface KeptPort {
	read(): unknown;
	update(step: (stored: unknown) => unknown): void;
}

export interface ScreenPort {
	cell(key: string): ViewCell;
}

export interface ShapeReader {
	readShape?(path: string): unknown;
}

export interface NotesPort extends FolderHost, FileHost {
	readonly shapes?: ShapeReader | null | undefined;
}

export interface QueryPorts extends ImplementationPorts {
	readonly prop: PropPort;
	readonly kept: KeptPort;
	readonly screen: ScreenPort;
	readonly notes: NotesPort;
}

export interface Pack {
	readonly id: string;
	readonly title: string;
	readonly queries: readonly GatewayMetadata[];
	readonly commands: readonly CommandMetadata[];
}

export interface PortsHost {
	readonly commandLine?: CommandLinePort | undefined;
	readonly workingDirectory?: string | undefined;
	readonly network?: NetworkPort | undefined;
	readonly vault?: VaultPort | undefined;
	readonly catalogue?: CataloguePort | undefined;
	readonly confirm?: ((said: string) => Promise<boolean>) | undefined;
}

const OUTSIDE_THE_PACK = '{id} is not named under its pack "{pack}": name it "{pack}/…"';
const NO_COMMAND_LINE = "no command line on this host";
const NO_NETWORK = "no network on this host";
const NO_VAULT = "no vault on this host";

const SHUT_COMMAND_LINE: CommandLinePort = {
	can: false,
	run: async () => ({ ok: false, output: "", failure: NO_COMMAND_LINE }),
};

const SHUT_NETWORK: NetworkPort = {
	can: false,
	request: () => Promise.reject(new Error(NO_NETWORK)),
};

const SHUT_VAULT: VaultPort = {
	can: false,
	folder: () => {
		throw new Error(NO_VAULT);
	},
	notesTagged: () => Promise.reject(new Error(NO_VAULT)),
	notesMatching: () => Promise.reject(new Error(NO_VAULT)),
	open: () => {
		throw new Error(NO_VAULT);
	},
};

const NAMED_TWICE = "{id} names two implementations of one pack";

const REGISTERED = new Map<string, Pack>();

export function definePack(pack: Pack): Pack {
	const ids = [...pack.queries, ...pack.commands].map((entry) => entry.id);
	const outside = ids.find((id) => !id.startsWith(`${pack.id}/`));
	if (outside) throw new Error(OUTSIDE_THE_PACK.replace("{id}", outside).split("{pack}").join(pack.id));
	const twice = ids.find((id, at) => ids.indexOf(id) !== at);
	if (twice) throw new Error(NAMED_TWICE.replace("{id}", twice));
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

export function portsOf(host: PortsHost, refs: RefsPort, self: string): ImplementationPorts {
	return {
		self,
		commandLine: host.commandLine ?? SHUT_COMMAND_LINE,
		workingDirectory: host.workingDirectory,
		network: host.network ?? SHUT_NETWORK,
		vault: host.vault ?? SHUT_VAULT,
		refs,
		catalogue: host.catalogue ?? NO_CATALOGUE_PORT,
		confirm: host.confirm ?? (async () => false),
	};
}
