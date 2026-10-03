import fs from "node:fs";
import nodePath from "node:path";
import type { FileStat, RegistryAdapter } from "../packages/core/src/registry-reading.js";
import type { StartupSnapshot, StartupSnapshotStore } from "../packages/core/src/startup-snapshot.js";
import type { AgentFilesAdapter } from "../apps/obsidian/src/ai/agent-files.js";
import { standIn } from "./stand-in.ts";

Object.assign(globalThis, {
	window: { setTimeout, clearTimeout, queueMicrotask },
	document: {
		head: { appendChild: () => {} },
		createElement: () => ({ dataset: {}, remove: () => {} }),
	},
});

const { WidgetRegistry } = await import("../packages/core/src/registry.js");
const { StartupCache } = await import("../packages/core/src/startup-snapshot.js");
const { removeLaidCatalogue, withSystemWidgets } = await import("../apps/obsidian/src/catalogue-widgets.js");
const { boardWidgets, isSystemDefinition } = await import("../packages/core/src/registry.js");
const { SYSTEM_WIDGETS_DIR } = await import("../packages/core/src/paths.js");

const SOURCE = nodePath.resolve("registry");
const FETCH_MS = Number(process.env["FETCH_MS"] ?? 20);
const WIDGETS_DIR = ".widgetarium/widgets";
const STAMP = "1.0.0+under-test";
const EDITED_FOLDER = `${WIDGETS_DIR}/@default/chart`;
const EDITED_SOURCE = `${EDITED_FOLDER}/widget.tsx`;

let failed = 0;
let checks = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

interface Asked {
	reads: number;
	lists: number;
	exists: number;
	stats: number;
	writes: number;
}

const asked: Asked = { reads: 0, lists: 0, exists: 0, stats: 0, writes: 0 };
const forget = (): void => {
	asked.reads = 0;
	asked.lists = 0;
	asked.exists = 0;
	asked.stats = 0;
	asked.writes = 0;
};
const touches = (): number => asked.reads + asked.lists + asked.exists + asked.stats;

const held = new Map<string, { text: string; mtime: number }>();
const walk = (at: string, to: string): void => {
	for (const name of fs.readdirSync(at)) {
		const here = nodePath.join(at, name);
		if (fs.statSync(here).isDirectory()) walk(here, `${to}/${name}`);
		else held.set(`${to}/${name}`, { text: fs.readFileSync(here, "utf8"), mtime: 1 });
	}
};
walk(SOURCE, WIDGETS_DIR);
held.set(`${WIDGETS_DIR}/types/kit/charts/index.d 2.ts`, { text: "export declare const chart: number;\n", mtime: 1 });
const readPaths: string[] = [];

const fetched = (): Promise<void> => new Promise((done) => setTimeout(done, FETCH_MS));
const isUnder = (path: string, folder: string): boolean => path.startsWith(`${folder}/`);
const holdsAnything = (path: string): boolean => [...held.keys()].some((known) => isUnder(known, path));

const foldersUnder = (at: string): string[] => [
	...new Set(
		[...held.keys()]
			.filter((path) => isUnder(path, at) && path.slice(at.length + 1).includes("/"))
			.map((path) => `${at}/${path.slice(at.length + 1).split("/")[0]}`),
	),
];

const adapter: RegistryAdapter = {
	exists: async (path) => {
		asked.exists += 1;
		await fetched();
		return held.has(path) || holdsAnything(path);
	},
	read: async (path) => {
		asked.reads += 1;
		readPaths.push(path);
		await fetched();
		const file = held.get(path);
		if (!file) throw new Error(`${path} does not exist`);
		return file.text;
	},
	list: async (path) => {
		asked.lists += 1;
		await fetched();
		return {
			folders: foldersUnder(path),
			files: [...held.keys()].filter((known) => isUnder(known, path) && !known.slice(path.length + 1).includes("/")),
		};
	},
	stat: async (path): Promise<FileStat | null> => {
		asked.stats += 1;
		await fetched();
		const file = held.get(path);
		return file ? { mtime: file.mtime, size: file.text.length } : null;
	},
};

interface MemoryStore extends StartupSnapshotStore {
	held: unknown;
}

const memoryStore = (): MemoryStore => {
	const store: MemoryStore = {
		held: null,
		read: async (): Promise<unknown> => structuredClone(store.held),
		write: async (snapshot: StartupSnapshot): Promise<void> => {
			store.held = structuredClone(snapshot);
		},
	};
	return store;
};

const startOver = (store: StartupSnapshotStore, stamp = STAMP) => {
	const registry = new WidgetRegistry({ vault: { adapter } });
	return { registry, cache: new StartupCache({ registry, adapter, store, stamp }) };
};

const isRecord = (held: unknown): held is Record<string, unknown> => typeof held === "object" && held !== null;
const settled = (): Promise<void> => new Promise((done) => setTimeout(done, 0));
const timed = async <T>(run: () => Promise<T>): Promise<{ answer: T; ms: number }> => {
	const at = performance.now();
	const answer = await run();
	return { answer, ms: Math.round(performance.now() - at) };
};
const drawnIds = (registry: InstanceType<typeof WidgetRegistry>): string[] =>
	registry
		.list()
		.filter((entry) => entry.component !== undefined)
		.map((entry) => String(entry.manifest["id"]))
		.sort();

console.log(`every vault question answers after ${FETCH_MS} ms, the way an evicted iCloud file does`);

console.log("\n— the first start reads the vault and keeps a snapshot —");
const store = memoryStore();
forget();
const first = startOver(store);
const fromVault = await timed(() => first.cache.mount());
await settled();
const vaultAsked = { ...asked };
check("with no snapshot the widgets come from the vault", fromVault.answer.from, "vault");
check("and a snapshot is kept", store.held !== null, true);
check(
	"the types laid beside the scopes are never read as widgets",
	readPaths.filter((path) => path.includes("/types/")),
	[],
);
console.log(
	`     vault path: ${vaultAsked.reads} reads, ${vaultAsked.lists} lists, ${vaultAsked.exists} exists, ${vaultAsked.stats} stats, ${fromVault.ms} ms, ${fromVault.answer.widgets} widgets`,
);

console.log("\n— (a) a start with a valid snapshot touches no file —");
forget();
const second = startOver(store);
const fromSnapshot = await timed(() => second.cache.mount());
check("the widgets come from the snapshot", fromSnapshot.answer.from, "snapshot");
check("every widget the vault mounted is mounted", fromSnapshot.answer.widgets, fromVault.answer.widgets);
check("and draws the same components", drawnIds(second.registry), drawnIds(first.registry));
check("with no question asked of the vault before started", touches(), 0);
console.log(`     snapshot path: ${asked.reads} reads, ${fromSnapshot.ms} ms`);

console.log("\n— (b) revalidating an unchanged vault reads nothing —");
forget();
check("nothing changed", await second.cache.filesChanged(), []);
check("not one file was read", asked.reads, 0);
check("only listed and stated", asked.lists > 0 && asked.stats > 0, true);

console.log("\n— (c) a changed file is picked up and remounted —");
held.set(EDITED_SOURCE, { text: 'throw new Error("edited");\n', mtime: 2 });
const changed = await second.cache.filesChanged();
check("the edited source is the change", changed, [EDITED_SOURCE]);
forget();
await second.registry.load();
check("and the reload reads only the file that changed", readPaths.slice(-asked.reads), [EDITED_SOURCE]);
await settled();
const edited = second.registry.list().find((entry) => entry.folder === EDITED_FOLDER);
check("the reload mounts the edited code", String(edited?.error), "Error: edited");
check("and the snapshot is rewritten with it", await second.cache.filesChanged(), []);
const third = startOver(store);
await third.cache.mount();
check(
	"the next start mounts the edit from the snapshot",
	String(third.registry.list().find((entry) => entry.folder === EDITED_FOLDER)?.error),
	"Error: edited",
);

console.log("\n— (d) a snapshot from another plugin build mounts and is revalidated like any other —");
forget();
const stale = startOver(store, "2.0.0+newer");
check("a snapshot from another plugin build is mounted", (await stale.cache.mount()).from, "snapshot");
check("with no question asked of the vault before started", touches(), 0);
check(
	"and an unchanged vault reads no file when it is revalidated",
	[await stale.cache.filesChanged(), asked.reads],
	[[], 0],
);
held.set(EDITED_SOURCE, { text: 'throw new Error("edited again");\n', mtime: 3 });
check("while a file changed since is still the change", await stale.cache.filesChanged(), [EDITED_SOURCE]);
console.log("\n— (d2) a corrupt snapshot falls back to the vault —");
const corrupt = memoryStore();
corrupt.held = { stamp: STAMP, buildsChecked: false, read: { widgets: 5, packages: [], fingerprint: {} } };
check("a snapshot that does not parse is not mounted", (await startOver(corrupt).cache.mount()).from, "vault");
const misaligned = memoryStore();
const kept = structuredClone(store.held);
if (isRecord(kept) && isRecord(kept["read"]) && isRecord(kept["read"]["widgets"]))
	kept["read"]["widgets"]["folders"] = [];
misaligned.held = kept;
check(
	"a snapshot whose lists no longer line up is not mounted",
	(await startOver(misaligned).cache.mount()).from,
	"vault",
);

console.log("\n— (e) the plugin's own widgets come from the plugin, never from the vault —");
const systemAdapter = withSystemWidgets(adapter);
const withSystem = new WidgetRegistry({ vault: { adapter: systemAdapter } });
await withSystem.load();
const catalogueFolders = withSystem
	.list()
	.filter((entry) => String(entry.manifest?.["id"]).startsWith("@catalogue/"))
	.map((entry) => entry.folder ?? "");
check(
	"every catalogue widget is read from the plugin",
	catalogueFolders.length > 0 && catalogueFolders.every((folder) => isUnder(folder, SYSTEM_WIDGETS_DIR)),
	true,
);
check(
	"so the vault's copy of the scope is shadowed",
	catalogueFolders.some((folder) => isUnder(folder, WIDGETS_DIR)),
	false,
);
check("none of them is offered for a board", boardWidgets(withSystem.list()).some(isSystemDefinition), false);
check(
	"while the vault's own widgets still are",
	boardWidgets(withSystem.list()).some((entry) => entry.manifest?.["id"] === "@default/chart"),
	true,
);

console.log("\n— (f) a snapshot mounts the plugin's widgets as they are now —");
const staleStore = memoryStore();
await startOver(staleStore).cache.mount();
await settled();
const fresh = new WidgetRegistry({ vault: { adapter: systemAdapter } });
const freshCache = new StartupCache({
	registry: fresh,
	adapter: systemAdapter,
	store: staleStore,
	stamp: STAMP,
	systemRoot: SYSTEM_WIDGETS_DIR,
});
check("a snapshot holding the vault's old copy is mounted", (await freshCache.mount()).from, "snapshot");
check(
	"with the catalogue taken from the plugin instead",
	isUnder(fresh.get("@catalogue/widget-list")?.folder ?? "", SYSTEM_WIDGETS_DIR),
	true,
);

console.log("\n— (g) the copy an older plugin laid is removed, and only that copy —");
const laidPaths = new Set([`${WIDGETS_DIR}/@catalogue/.laid-by-plugin`, `${WIDGETS_DIR}/@catalogue/head/widget.tsx`]);
const removed: string[] = [];
const laidAdapter = standIn<AgentFilesAdapter>(
	{
		read: async (path: string) => {
			if (!laidPaths.has(path)) throw new Error(`${path} does not exist`);
			return "laid";
		},
		rmdir: async (path: string) => {
			removed.push(path);
		},
	},
	["read", "rmdir"],
	"adapter",
);
check(
	"a marked copy is removed",
	[await removeLaidCatalogue(laidAdapter), removed],
	[true, [`${WIDGETS_DIR}/@catalogue`]],
);
laidPaths.delete(`${WIDGETS_DIR}/@catalogue/.laid-by-plugin`);
removed.length = 0;
check("a scope without the mark is left alone", [await removeLaidCatalogue(laidAdapter), removed], [false, []]);

console.log(`\n${checks - failed}/${checks} startup snapshot checks passed`);
process.exit(failed === 0 ? 0 : 1);
