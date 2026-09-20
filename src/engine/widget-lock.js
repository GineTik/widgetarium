import { contentHash } from "./content-hash.js";
import { nameIn } from "./modules.js";

// WHAT IS ACTUALLY INSTALLED, pinned to a commit. Nothing here ever updates itself: an update is a
// comparison a person presses, and a tag can be moved under its own name where a commit cannot.
export const EMPTY_LOCK = { version: 1, widgets: {}, modules: {}, builds: {} };

const asObject = (held) => (held && typeof held === "object" ? held : {});

// TRADE-OFF: a build recorded inside a widget entry is read from there and written to builds, because what is installed and what is built are two facts and only one of them belongs to a repository
function buildsIn(parsed) {
	const held = {};
	for (const [id, record] of Object.entries(asObject(parsed.builds))) held[id] = buildRead(record);
	for (const [id, entry] of Object.entries(asObject(parsed.widgets))) {
		if (entry?.build?.from && !held[id]) held[id] = buildRead(entry.build);
	}
	return held;
}

function buildRead(record) {
	return { from: String(record?.from ?? ""), compiler: record?.compiler ?? null, inputs: asObject(record?.inputs) };
}

export function readLock(raw) {
	const parsed = asObject(raw);
	return {
		version: 1,
		widgets: { ...asObject(parsed.widgets) },
		modules: { ...asObject(parsed.modules) },
		builds: buildsIn(parsed),
	};
}

function hashesOf(texts) {
	const hashes = {};
	for (const [name, text] of Object.entries(texts ?? {})) hashes[name] = contentHash(text);
	return hashes;
}

export function commitsOf(entry) {
	if (Array.isArray(entry?.commits)) return entry.commits;
	return entry?.commit ? [entry.commit] : [];
}

export const INSTALL_PENDING = "pending";
export const INSTALLED = "installed";

export function lockEntry({ source, commit, files, path = null, commits = [], state = INSTALLED }) {
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

export function buildRecord({ from, compiler, inputs }) {
	return { from, compiler: compiler ?? null, inputs: hashesOf(inputs) };
}

export function buildMatchesSource(record, path, source) {
	if (!record?.inputs || !(path in record.inputs)) return false;
	return contentHash(source) === record.inputs[path];
}

export function buildIsCurrent(record, inputs) {
	if (!record?.inputs) return false;
	return Object.entries(record.inputs).every(([path, hash]) => contentHash(inputs?.[path]) === hash);
}

function lockWith(lock, changed) {
	return {
		version: 1,
		widgets: { ...lock.widgets },
		modules: { ...lock.modules },
		builds: { ...lock.builds },
		...changed,
	};
}

export function withEntry(lock, id, entry) {
	return lockWith(lock, { widgets: { ...lock.widgets, [id]: entry } });
}

export function withoutEntry(lock, id) {
	const widgets = { ...lock.widgets };
	const builds = { ...lock.builds };
	delete widgets[id];
	delete builds[id];
	return lockWith(lock, { widgets, builds });
}

export function withBuild(lock, id, record) {
	return lockWith(lock, { builds: { ...lock.builds, [id]: record } });
}

export function withModule(lock, id, { key, path, hash }) {
	const pointing = [...new Set([...(lock.modules?.[key]?.widgets ?? []), id])].sort();
	return lockWith(lock, { modules: { ...lock.modules, [key]: { path, hash, widgets: pointing } } });
}

export function releaseModules(lock, id) {
	const modules = {};
	const collected = [];
	for (const [key, entry] of Object.entries(lock.modules ?? {})) {
		const pointing = (entry.widgets ?? []).filter((held) => held !== id);
		if (pointing.length === 0) collected.push(key);
		else modules[key] = { ...entry, widgets: pointing };
	}
	return { lock: lockWith(lock, { modules }), collected };
}

export function modulesByWidget(lock) {
	const found = new Map();
	for (const [key, entry] of Object.entries(lock.modules ?? {})) {
		for (const id of entry.widgets ?? []) {
			if (!found.has(id)) found.set(id, new Map());
			found.get(id).set(nameIn(key), key);
		}
	}
	return found;
}

// CONTEXT: an update offered against an edited widget must fork or refuse, never overwrite —
// this is what tells the two apart
export function isEdited(entry, files) {
	if (!entry) return false;
	return Object.entries(entry.files ?? {}).some(([name, hash]) => contentHash(files?.[name]) !== hash);
}
