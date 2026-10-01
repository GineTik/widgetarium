import { fieldsOf } from "../packages/core/src/gateway/fields.js";
import { refusingConsole } from "../packages/core/src/engine/host-console.js";
import type { NoteAddress, NoteRecord, VaultSlot } from "../packages/core/src/gateway/obsidian.js";
import type { ViewHost } from "../packages/core/src/gateway/host.js";
import type { FolderListing } from "../packages/core/src/engine/widget-build.js";
import type { RegistryAdapter } from "../packages/core/src/registry-reading.js";
import type { SurfaceHost } from "../packages/core/src/surface/use-surface-shared.js";

export type FileMap = Readonly<Record<string, string>>;

const under = (files: FileMap, at: string): string[] => Object.keys(files).filter((key) => key.startsWith(`${at}/`));

function foldersIn(files: FileMap, at: string): string[] {
	const seen = new Set<string>();
	for (const key of under(files, at)) {
		const rest = key.slice(at.length + 1);
		if (rest.includes("/")) seen.add(`${at}/${rest.split("/")[0]}`);
	}
	return [...seen];
}

const leavesIn = (files: FileMap, at: string): string[] =>
	under(files, at).filter((key) => !key.slice(at.length + 1).includes("/"));

export function createFileTree(files: FileMap): RegistryAdapter {
	return {
		exists: async (at) =>
			Object.prototype.hasOwnProperty.call(files, at) ||
			foldersIn(files, at).length > 0 ||
			leavesIn(files, at).length > 0,
		read: async (at) => files[at] ?? "",
		list: async (at): Promise<FolderListing> => ({ folders: foldersIn(files, at), files: leavesIn(files, at) }),
	};
}

export function createRowSlot(rows: readonly NoteRecord[]): VaultSlot & { readonly canDescribe: boolean } {
	return {
		canCreate: true,
		canUpdate: true,
		canRemove: true,
		canSubscribe: false,
		canDescribe: true,
		list: async () => ({ rows, total: rows.length }),
		get: async (ref: NoteAddress) => rows.find((row) => row.path === ref.path) ?? null,
		describe: async () => fieldsOf(rows),
		create: async () => null,
		update: async () => null,
		remove: async () => null,
	};
}

export const PROBE_VIEW: ViewHost = {
	platform: "probe",
	type: "probe",
	can: { catalogue: true, fullscreen: false, subscribe: false, network: false, renderMarkdown: false },
	console: refusingConsole("a probe page has no console"),
	ui: { notify() {}, renderMarkdown: () => () => {} },
};

export function createProbeHost(slot: VaultSlot): SurfaceHost {
	return { ...PROBE_VIEW, slot: () => slot, here: null };
}
