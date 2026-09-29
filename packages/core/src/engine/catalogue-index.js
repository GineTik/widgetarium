export const RECORD_FILE = "manifest.generated.json";
export const RECORD_FILES = [RECORD_FILE];
export const GENERATED_NOTE = "widgetarium build — do not edit";

export function readRecord(raw, idOfItsFolder) {
	const held = raw && typeof raw === "object" ? raw : {};
	const named = typeof held.id === "string" && held.id ? held.id : idOfItsFolder;
	return { ...held, id: named, title: held.title ?? named };
}

const PROP_KEYS = [
	"kind",
	"control",
	"type",
	"label",
	"hint",
	"aka",
	"source",
	"design",
	"shape",
	"writes",
	"describes",
	"tracks",
	"where",
	"sort",
	"default",
	"wants",
];

const SIZE_KEYS = ["collapseBelowPx", "stackBelowPx"];

export function manifestOf(record, exported) {
	const declared = declarationOf(exported);
	const props = propsOf(declared?.props ?? record?.props ?? null);
	return { ...withFlattenedSize(record), ...withFlattenedSize(declared), id: record.id, ...(props ? { props } : {}) };
}

const CARD_KEYS = ["title", "description", "keywords", "role", "view", "inline", "size", "preview", "slots", "mounts"];

export function cardOf(declared, api) {
	return {
		$generated: GENERATED_NOTE,
		api,
		...present(CARD_KEYS.map((key) => [key, jsonSafeWhenSet(declared[key])])),
		props: jsonSafe(propsOf(declared.props) ?? {}),
		migrates: migratesOf(declared.migrate ?? []),
	};
}

const COMPARED_CARD_KEYS = [...CARD_KEYS, "props", "migrates"];

export function firstDifferingCardKey(fromCode, served) {
	return (
		COMPARED_CARD_KEYS.find(
			(key) => JSON.stringify(fromCode?.[key] ?? null) !== JSON.stringify(served?.[key] ?? null),
		) ?? null
	);
}

export function recordIn(files) {
	return files?.[RECORD_FILE];
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

function specInOneOrder(spec) {
	const written = Object.keys(spec);
	const ordered = [
		...PROP_KEYS.filter((key) => written.includes(key)),
		...written.filter((key) => !PROP_KEYS.includes(key)),
	];
	return Object.fromEntries(ordered.map((key) => [key, spec[key]]));
}

const present = (entries) => Object.fromEntries(entries.filter(([, held]) => held !== undefined));

function propsOf(declared) {
	if (!declared) return null;
	return Object.fromEntries(Object.entries(declared).map(([name, spec]) => [name, specInOneOrder(spec)]));
}

function declarationOf(exported) {
	return exported?.manifest ?? null;
}

function preferredSizeOf(size) {
	if (size?.preferredWidth === undefined && size?.preferredHeight === undefined) return {};
	const { preferredWidth, preferredHeight, keepsRatio, at } = size;
	return { preferredSize: { preferredWidth, preferredHeight, keepsRatio: keepsRatio === true, at: at ?? [] } };
}

function withFlattenedSize(held) {
	const { size, isManifest, $generated, migrates, ...rest } = held ?? {};
	const pixels = Object.fromEntries(
		SIZE_KEYS.filter((key) => typeof size?.[key] === "number").map((key) => [key, size[key]]),
	);
	return { ...rest, ...pixels, ...preferredSizeOf(size) };
}

const jsonSafe = (held) => JSON.parse(JSON.stringify(held));

const jsonSafeWhenSet = (held) => (held === undefined ? undefined : jsonSafe(held));

const migratesOf = (steps) => steps.map((step) => ({ from: jsonSafe(propsOf(step.from)) }));
