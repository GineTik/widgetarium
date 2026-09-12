import { contentHash } from "./content-hash.js";
import { nameIn } from "./modules.js";

// WHAT IS ACTUALLY INSTALLED, pinned to a commit. Nothing here ever updates itself: an update is a
// comparison a person presses, and a tag can be moved under its own name where a commit cannot.
export const EMPTY_LOCK = { version: 1, widgets: {}, modules: {} };

export function readLock(raw) {
	const parsed = raw && typeof raw === "object" ? raw : {};
	const widgets = parsed.widgets && typeof parsed.widgets === "object" ? parsed.widgets : {};
	const modules = parsed.modules && typeof parsed.modules === "object" ? parsed.modules : {};
	return { version: 1, widgets: { ...widgets }, modules: { ...modules } };
}

export function lockEntry({ source, commit, files, builtFrom }) {
	const hashes = {};
	for (const [name, text] of Object.entries(files ?? {})) hashes[name] = contentHash(text);
	return { source: String(source ?? ""), commit: String(commit ?? ""), files: hashes, build: builtFrom ? { from: builtFrom } : null };
}

export function buildIsCurrent(entry, name, source) {
	if (entry?.build?.from !== name) return false;
	return contentHash(source) === entry.files?.[name];
}

export function withEntry(lock, id, entry) {
	return { version: 1, widgets: { ...lock.widgets, [id]: entry }, modules: { ...lock.modules } };
}

export function withoutEntry(lock, id) {
	const widgets = { ...lock.widgets };
	delete widgets[id];
	return { version: 1, widgets, modules: { ...lock.modules } };
}

export function withModule(lock, id, { key, path, hash }) {
	const pointing = [...new Set([...(lock.modules?.[key]?.widgets ?? []), id])].sort();
	return { version: 1, widgets: { ...lock.widgets }, modules: { ...lock.modules, [key]: { path, hash, widgets: pointing } } };
}

export function releaseModules(lock, id) {
	const modules = {};
	const collected = [];
	for (const [key, entry] of Object.entries(lock.modules ?? {})) {
		const pointing = (entry.widgets ?? []).filter((held) => held !== id);
		if (pointing.length === 0) collected.push(key);
		else modules[key] = { ...entry, widgets: pointing };
	}
	return { lock: { version: 1, widgets: { ...lock.widgets }, modules }, collected };
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
