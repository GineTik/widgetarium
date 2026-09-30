import { contentHash } from "./content-hash.js";
import { nameIn } from "./modules.js";
import { isWidgetModule } from "./widget-build.js";
import { isObject } from "./is-object.js";
import type { Fields } from "./catalogue-index.js";

export type HashedFiles = Readonly<Record<string, string>>;
export type Texts = Readonly<Record<string, string | null | undefined>>;

export interface BuildRecord {
	readonly from: string;
	readonly compiler: unknown;
	readonly inputs: Fields;
}

export interface WidgetLock {
	readonly version: 1;
	readonly widgets: Fields;
	readonly modules: Fields;
	readonly builds: Readonly<Record<string, BuildRecord>>;
}

export type InstallState = typeof INSTALL_PENDING | typeof INSTALLED;

export interface LockEntry {
	readonly source: string;
	readonly path: string | null;
	readonly commit: string;
	readonly commits: string[];
	readonly files: HashedFiles;
	readonly state: InstallState;
}

export interface LockEntryInput {
	readonly source?: unknown;
	readonly commit?: unknown;
	readonly files?: Texts | null;
	readonly path?: string | null;
	readonly commits?: readonly string[];
	readonly state?: InstallState;
}

export interface BuildInput {
	readonly from: string;
	readonly compiler?: unknown;
	readonly inputs?: Texts | null;
}

export interface LockedModule {
	readonly key: string;
	readonly path: string;
	readonly hash: string;
}

export interface ReleasedModules {
	readonly lock: WidgetLock;
	readonly collected: string[];
}

export const EMPTY_LOCK: WidgetLock = { version: 1, widgets: {}, modules: {}, builds: {} };

export const INSTALL_PENDING = "pending";
export const INSTALLED = "installed";

export function readLock(raw: unknown): WidgetLock {
	const parsed = fieldsOf(raw);
	return {
		version: 1,
		widgets: { ...fieldsOf(parsed["widgets"]) },
		modules: { ...fieldsOf(parsed["modules"]) },
		builds: buildsIn(parsed),
	};
}

export function commitsOf(entry: unknown): readonly unknown[] {
	if (!isObject(entry)) return [];
	const commits = entry["commits"];
	if (Array.isArray(commits)) return commits;
	return entry["commit"] ? [entry["commit"]] : [];
}

export function lockEntry({
	source,
	commit,
	files,
	path = null,
	commits = [],
	state = INSTALLED,
}: LockEntryInput): LockEntry {
	const absorbed = [...new Set([...commits, String(commit ?? "")])].filter(Boolean);
	return {
		source: String(source ?? ""),
		path,
		commit: String(commit ?? ""),
		commits: absorbed,
		files: hashesOf(files),
		state,
	};
}

export function buildRecord({ from, compiler, inputs }: BuildInput): BuildRecord {
	return { from, compiler: compiler ?? null, inputs: hashesOf(inputs) };
}

export function buildMatchesSources(
	record: BuildRecord | null | undefined,
	folder: string,
	sources: Readonly<Record<string, string>>,
): boolean {
	if (!record?.inputs) return false;
	const inputs = record.inputs;
	const recorded = Object.keys(inputs).filter(
		(path) => path.startsWith(`${folder}/`) && isWidgetModule(path.slice(folder.length + 1)),
	);
	const named = Object.entries(sources);
	return (
		recorded.length === named.length &&
		named.every(([name, source]) => buildMatchesSource(inputs, `${folder}/${name}`, source))
	);
}

export function buildIsCurrent(record: BuildRecord | null | undefined, inputs: Texts | null | undefined): boolean {
	if (!record?.inputs) return false;
	return Object.entries(record.inputs).every(([path, hash]) => contentHash(inputs?.[path]) === hash);
}

export function withEntry(lock: WidgetLock, id: string, entry: unknown): WidgetLock {
	return lockWith(lock, { widgets: { ...lock.widgets, [id]: entry } });
}

export function withoutEntry(lock: WidgetLock, id: string): WidgetLock {
	const widgets = { ...lock.widgets };
	const builds = { ...lock.builds };
	delete widgets[id];
	delete builds[id];
	return lockWith(lock, { widgets, builds });
}

export function withBuild(lock: WidgetLock, id: string, record: BuildRecord): WidgetLock {
	return lockWith(lock, { builds: { ...lock.builds, [id]: record } });
}

export function withModule(lock: WidgetLock, id: string, { key, path, hash }: LockedModule): WidgetLock {
	const pointing = [...new Set([...widgetsPointingAt(lock.modules[key]), id])].sort();
	return lockWith(lock, { modules: { ...lock.modules, [key]: { path, hash, widgets: pointing } } });
}

export function releaseModules(lock: WidgetLock, id: string): ReleasedModules {
	const modules: Record<string, unknown> = {};
	const collected: string[] = [];
	for (const [key, entry] of Object.entries(lock.modules)) {
		const pointing = widgetsPointingAt(entry).filter((held) => held !== id);
		if (pointing.length === 0) collected.push(key);
		else modules[key] = { ...fieldsOf(entry), widgets: pointing };
	}
	return { lock: lockWith(lock, { modules }), collected };
}

export function modulesByWidget(lock: WidgetLock): Map<unknown, Map<string, string>> {
	const found = new Map<unknown, Map<string, string>>();
	for (const [key, entry] of Object.entries(lock.modules)) {
		for (const id of widgetsPointingAt(entry)) {
			const named = found.get(id) ?? new Map<string, string>();
			named.set(nameIn(key), key);
			found.set(id, named);
		}
	}
	return found;
}

export function isEdited(entry: unknown, files: Texts | null | undefined): boolean {
	if (!entry) return false;
	return Object.entries(fieldsOf(fieldsOf(entry)["files"])).some(([name, hash]) => contentHash(files?.[name]) !== hash);
}

function fieldsOf(held: unknown): Fields {
	return isObject(held) ? held : {};
}

function widgetsPointingAt(entry: unknown): readonly unknown[] {
	const widgets = fieldsOf(entry)["widgets"];
	return Array.isArray(widgets) ? widgets : [];
}

// TRADE-OFF: a build recorded inside a widget entry is read from there and written to builds, because what is installed and what is built are two facts and only one of them belongs to a repository
function buildsIn(parsed: Fields): Record<string, BuildRecord> {
	const held: Record<string, BuildRecord> = {};
	for (const [id, record] of Object.entries(fieldsOf(parsed["builds"]))) held[id] = readBuild(record);
	for (const [id, entry] of Object.entries(fieldsOf(parsed["widgets"]))) {
		const build = fieldsOf(entry)["build"];
		if (fieldsOf(build)["from"] && !held[id]) held[id] = readBuild(build);
	}
	return held;
}

function readBuild(record: unknown): BuildRecord {
	const held = fieldsOf(record);
	return { from: String(held["from"] ?? ""), compiler: held["compiler"] ?? null, inputs: fieldsOf(held["inputs"]) };
}

function hashesOf(texts: Texts | null | undefined): Record<string, string> {
	const hashes: Record<string, string> = {};
	for (const [name, text] of Object.entries(texts ?? {})) hashes[name] = contentHash(text);
	return hashes;
}

function buildMatchesSource(inputs: Fields, path: string, source: string): boolean {
	if (!(path in inputs)) return false;
	return contentHash(source) === inputs[path];
}

function lockWith(lock: WidgetLock, changed: Partial<WidgetLock>): WidgetLock {
	return {
		version: 1,
		widgets: { ...lock.widgets },
		modules: { ...lock.modules },
		builds: { ...lock.builds },
		...changed,
	};
}
