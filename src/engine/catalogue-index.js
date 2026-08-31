// THE INDEX IS A SECOND LIST, never a second inventory. The registry is what is installed; this is
// what could be. They merge by manifest id, and LOCAL ALWAYS WINS — a widget somebody wrote this
// morning is never replaced by a repository entry that happens to share its id.
export function readIndex(raw) {
	const listed = Array.isArray(raw?.widgets) ? raw.widgets : [];
	return listed
		.filter((entry) => entry && typeof entry.id === "string" && entry.id)
		.map((entry) => ({
			manifest: { ...entry, id: entry.id, title: entry.title ?? entry.id },
			installed: false,
			origin: entry.repository ?? "index",
		}));
}

export function mergeCatalogue(installed, available) {
	const known = new Set(installed.map((entry) => entry.manifest?.id));
	return [...installed, ...available.filter((entry) => !known.has(entry.manifest?.id))];
}

export function isInstalled(entry) {
	return entry?.installed !== false;
}
