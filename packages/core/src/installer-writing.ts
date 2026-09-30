import { WIDGETS_DIR, LOCK_PATH } from "./paths.js";
import {
	INSTALL_PENDING,
	commitsOf,
	readLock,
	lockEntry,
	withBuild,
	withEntry,
	withModule,
} from "./engine/widget-lock.js";
import type { LockEntryInput, WidgetLock } from "./engine/widget-lock.js";
import { declaredDependencies } from "./engine/modules.js";
import { scopeOf } from "./engine/widget-source.js";
import type { MadeBuild } from "./engine/builder.js";
import type { Fields } from "./engine/catalogue-index.js";
import { folderFor } from "./engine/github.js";
import { isObject } from "./engine/is-object.js";
import { refuse } from "./installer-context.js";
import type { HeldWidgetFiles, InstallerAdapter, Installing, Refusal } from "./installer-context.js";
import { cardMismatchIn } from "./installer-placement.js";
import type { Placement } from "./installer-placement.js";

export interface ListedOrigin {
	readonly origin?: unknown;
	readonly manifest?: Fields | null | undefined;
}

export type Installed =
	| {
			readonly ok: true;
			readonly id: string;
			readonly commit: string;
			readonly isNewGeneration: boolean;
			readonly failure: null;
	  }
	| Refusal;

type Made = Extract<MadeBuild, { readonly ok: true }>;

type Unresolved = { readonly ok: false; readonly lock: WidgetLock; readonly failure: string };

type Resolved = { readonly ok: true; readonly lock: WidgetLock; readonly failure: null } | Unresolved;

interface Generation {
	readonly listed: ListedOrigin | null | undefined;
	readonly held: HeldWidgetFiles;
	readonly placed: Placement;
	readonly made: Made;
}

type ScopeFiles = Readonly<Record<string, string>>;

export async function installPlaced(
	installing: Installing,
	listed: ListedOrigin | null | undefined,
	held: HeldWidgetFiles,
	placed: Placement,
): Promise<Installed> {
	const mismatch = await cardMismatchIn(installing, held);
	if (mismatch) return refuse(mismatch);
	const made = await makeFor(installing, readLock(await installing.readJson(LOCK_PATH, null)), placed.id, held);
	if (!made.ok) return refuse(made.failure);
	await writeGeneration(installing, { listed, held, placed, made });
	return { ok: true, id: placed.id, commit: held.commit, isNewGeneration: placed.isNewGeneration, failure: null };
}

export async function absorbCommit(
	{ writeJson }: Installing,
	lock: WidgetLock,
	id: string,
	commit: string,
): Promise<Installed> {
	const entry = lock.widgets[id];
	const spread = isObject(entry) ? entry : {};
	await writeJson(LOCK_PATH, withEntry(lock, id, { ...spread, commits: [...new Set([...commitsOf(entry), commit])] }));
	return { ok: true, id, commit, isNewGeneration: false, failure: null };
}

async function makeFor(
	installing: Installing,
	lock: WidgetLock,
	id: string,
	held: HeldWidgetFiles,
): Promise<MadeBuild | Unresolved> {
	const resolved = await withDependencies(installing, lock, id, held.record);
	if (!resolved.ok) return resolved;
	const folder = String(folderFor(WIDGETS_DIR, id));
	return installing.builder.make({
		lock: resolved.lock,
		id,
		folder,
		files: held.files,
		aboutToBeWritten: whatTheScopeIsAboutToGet(folder, held.scope),
	});
}

async function writeGeneration(installing: Installing, { listed, held, placed, made }: Generation): Promise<void> {
	const { writeJson } = installing;
	const id = placed.id;
	const folder = String(folderFor(WIDGETS_DIR, id));
	const described: LockEntryInput = {
		source: listed?.origin ?? listed?.manifest?.["repository"],
		commit: held.commit,
		files: held.files,
		path: pathIn(listed),
		commits: placed.commits,
	};
	await writeJson(LOCK_PATH, withEntry(made.lock, id, lockEntry({ ...described, state: INSTALL_PENDING })));
	await writeWidget(installing, folder, held.files, made);
	await writeWhatTheScopeShares(installing, folder, held.scope);
	const record = made.record;
	const entered = withEntry(made.lock, id, lockEntry(described));
	await writeJson(LOCK_PATH, record ? withBuild(entered, id, record) : entered);
}

function pathIn(listed: ListedOrigin | null | undefined): string | null {
	const path = listed?.manifest?.["path"];
	return typeof path === "string" ? path : null;
}

async function writeWidget(
	{ adapter, builder }: Installing,
	folder: string,
	files: ScopeFiles,
	made: Made,
): Promise<void> {
	await adapter.mkdir(scopeOf(folder));
	await adapter.mkdir(folder);
	for (const [name, text] of Object.entries(files)) {
		for (const inner of foldersLeadingTo(name)) await adapter.mkdir(`${folder}/${inner}`);
		await adapter.write(`${folder}/${name}`, text);
	}
	if (made.built.from) await builder.writeBuild(folder, made.built, made.css);
}

function foldersLeadingTo(name: string): string[] {
	const parts = name.split("/").slice(0, -1);
	return parts.map((_part, at) => parts.slice(0, at + 1).join("/"));
}

function whatTheScopeIsAboutToGet(folder: string, scope: ScopeFiles | null | undefined): Record<string, string> {
	const held: Record<string, string> = {};
	for (const [name, text] of Object.entries(scope ?? {})) held[`${scopeOf(folder)}/${name}`] = text;
	return held;
}

async function writeWhatTheScopeShares(
	{ adapter }: { readonly adapter: InstallerAdapter },
	folder: string,
	scope: ScopeFiles,
): Promise<void> {
	for (const [name, text] of Object.entries(scope)) await adapter.write(`${scopeOf(folder)}/${name}`, text);
}

async function withDependencies(
	{ space }: Installing,
	lock: WidgetLock,
	id: string,
	manifest: unknown,
): Promise<Resolved> {
	let held = lock;
	for (const [name, range] of declaredDependencies(manifest)) {
		const found = await space.take(held, name, range);
		if (!found.ok) return { ok: false, lock: held, failure: found.failure };
		held = withModule(held, id, found);
	}
	return { ok: true, lock: held, failure: null };
}
