import { contentHash } from "./content-hash.js";

// WHAT IS ACTUALLY INSTALLED, pinned to a commit. Nothing here ever updates itself: an update is a
// comparison a person presses, and a tag can be moved under its own name where a commit cannot.
export const EMPTY_LOCK = { version: 1, widgets: {} };

export function readLock(raw) {
	const parsed = raw && typeof raw === "object" ? raw : {};
	const widgets = parsed.widgets && typeof parsed.widgets === "object" ? parsed.widgets : {};
	return { version: 1, widgets: { ...widgets } };
}

export function lockEntry({ source, commit, files }) {
	const hashes = {};
	for (const [name, text] of Object.entries(files ?? {})) hashes[name] = contentHash(text);
	return { source: String(source ?? ""), commit: String(commit ?? ""), files: hashes };
}

export function withEntry(lock, id, entry) {
	return { version: 1, widgets: { ...lock.widgets, [id]: entry } };
}

export function withoutEntry(lock, id) {
	const widgets = { ...lock.widgets };
	delete widgets[id];
	return { version: 1, widgets };
}

// CONTEXT: an update offered against an edited widget must fork or refuse, never overwrite —
// this is what tells the two apart
export function isEdited(entry, files) {
	if (!entry) return false;
	return Object.entries(entry.files ?? {}).some(([name, hash]) => contentHash(files?.[name]) !== hash);
}
