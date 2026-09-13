// THE INDEX IS A SECOND LIST, never a second inventory. The registry is what is installed; this is
// what could be. They merge by manifest id, and LOCAL ALWAYS WINS — a widget somebody wrote this
// morning is never replaced by a repository entry that happens to share its id.
export const RECORD_FILE = "manifest.json";

export function readRecord(raw, idOfItsFolder) {
	const held = raw && typeof raw === "object" ? raw : {};
	const named = typeof held.id === "string" && held.id ? held.id : idOfItsFolder;
	return { ...held, id: named, title: held.title ?? named };
}

const PROP_KEYS = [
	"kind",
	"wasSetting",
	"shape",
	"type",
	"label",
	"hint",
	"was",
	"picks",
	"of",
	"field",
	"fieldFrom",
	"fallback",
	"design",
	"item",
	"wasSettings",
	"rowsFromText",
	"verbs",
	"default",
	"needs",
	"wants",
];

function specInOneOrder(spec) {
	const written = Object.keys(spec);
	const ordered = [
		...PROP_KEYS.filter((key) => written.includes(key)),
		...written.filter((key) => !PROP_KEYS.includes(key)),
	];
	return Object.fromEntries(ordered.map((key) => [key, spec[key]]));
}

function propsUnderDeclaration(derived, declared) {
	if (!derived && !declared) return null;
	const names = [...new Set([...Object.keys(declared ?? {}), ...Object.keys(derived ?? {})])];
	return Object.fromEntries(names.map((name) => [name, specInOneOrder({ ...derived?.[name], ...declared?.[name] })]));
}

export function recordUnderItsDeclaration(record, declared, derived = null) {
	const props = propsUnderDeclaration(derived ?? record?.props ?? null, declared?.props ?? null);
	return { ...record, ...(declared ?? {}), id: record.id, ...(props ? { props } : {}) };
}

export function hasStringId(entry) {
	return Boolean(entry) && typeof entry.id === "string" && entry.id !== "";
}

export function readIndex(raw) {
	const listed = Array.isArray(raw?.widgets) ? raw.widgets : [];
	return listed.filter(hasStringId).map((entry) => ({
		manifest: readRecord(entry, entry.id),
		installed: false,
		origin: entry.repository ?? "index",
	}));
}

export function mergeCatalogue(installed, available) {
	const known = new Set(installed.map((entry) => entry.manifest?.id));
	const held = [...installed];
	for (const entry of available) {
		if (known.has(entry.manifest?.id)) continue;
		known.add(entry.manifest?.id);
		held.push(entry);
	}
	return held;
}

export function isInstalled(entry) {
	return entry?.installed !== false;
}
