// THE INDEX IS A SECOND LIST, never a second inventory. The registry is what is installed; this is
// what could be. They merge by manifest id, and LOCAL ALWAYS WINS — a widget somebody wrote this
// morning is never replaced by a repository entry that happens to share its id.
import { COLLECTION_VERBS } from "../gateway/contract";

export const RECORD_FILE = "manifest.generated.json";
export const LEGACY_RECORD_FILE = "manifest.json";
export const RECORD_FILES = [RECORD_FILE, LEGACY_RECORD_FILE];
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
	"picks",
	"of",
	"field",
	"fieldFrom",
	"fallback",
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

const SIZE_KEYS = ["collapseBelowPx", "stackBelowPx", "tallestPx", "shortestPx"];

function specInOneOrder(spec) {
	const written = Object.keys(spec);
	const ordered = [
		...PROP_KEYS.filter((key) => written.includes(key)),
		...written.filter((key) => !PROP_KEYS.includes(key)),
	];
	return Object.fromEntries(ordered.map((key) => [key, spec[key]]));
}

const isBuilderMade = (spec) => Array.isArray(spec?.writes);

const present = (entries) => Object.fromEntries(entries.filter(([, held]) => held !== undefined));

const marksAValue = (spec) => Boolean(spec.of || spec.picks || spec.type) || spec.default?.from === "memory";

const holdsOneValue = (held) => held !== undefined && !Array.isArray(held);

function legacyKind(spec) {
	if (spec.kind) return spec.kind;
	return marksAValue(spec) || holdsOneValue(spec.default?.value) ? "value" : "collection";
}

function legacyControl(spec, kind) {
	if (spec.type) return spec.type;
	if (spec.picks) return "row";
	if (spec.of) return "pick";
	if (spec.default?.from === "memory") return "memory";
	return kind === "value" ? "json" : undefined;
}

function legacyUses(spec, kind) {
	if (Array.isArray(spec.verbs)) return spec.verbs;
	if (spec.verbs) return Object.keys(spec.verbs);
	if (kind === "collection") return COLLECTION_VERBS;
	return spec.of && !spec.picks ? ["get", "update"] : ["get"];
}

function legacyDefault(spec, kind) {
	const { where, sort, ...declared } = spec.default ?? {};
	if (kind !== "collection" || !Array.isArray(declared.value))
		return Object.keys(declared).length > 0 ? declared : undefined;
	const { value: rows, ...rest } = declared;
	return { ...rest, rows };
}

// TODO: delete legacyProp once every shipped widget declares defineManifest
function legacyDescribes(spec) {
	const listed = Array.isArray(spec.item?.fields) ? spec.item.fields : [];
	const described = Object.fromEntries(
		listed
			.filter((field) => field.key)
			.map((field) => [
				field.key,
				present(Object.entries({ label: field.label, type: field.type, required: field.required || undefined })),
			]),
	);
	for (const [field, need] of Object.entries(spec.needs ?? {})) {
		const { was, ...held } = need;
		described[field] = { ...described[field], ...held, ...(was ? { aka: [was, ...(need.aka ?? [])] } : {}) };
	}
	return Object.keys(described).length > 0 ? described : undefined;
}

function legacyFields(spec, kind) {
	return [
		["kind", kind],
		["control", legacyControl(spec, kind)],
		["type", spec.type],
		["aka", spec.was === undefined ? undefined : [].concat(spec.was)],
		["writes", legacyUses(spec, kind)],
		["describes", legacyDescribes(spec)],
		["where", spec.default?.where],
		["sort", spec.default?.sort],
		["default", legacyDefault(spec, kind)],
	];
}

function legacyProp(spec) {
	const { verbs, wasSetting, wasSettings, rowsFromText, type, item, needs, was, default: declared, ...kept } = spec;
	return { ...kept, ...present(legacyFields(spec, legacyKind(spec))) };
}

function propsOf(declared, derived) {
	if (!declared && !derived) return null;
	const names = [...new Set([...Object.keys(declared ?? {}), ...Object.keys(derived ?? {})])];
	return Object.fromEntries(
		names.map((name) => {
			const spec = declared?.[name] ?? {};
			return [name, specInOneOrder(isBuilderMade(spec) ? spec : legacyProp({ ...derived?.[name], ...spec }))];
		}),
	);
}

function declarationOf(exported) {
	if (exported?.manifest) return exported.manifest;
	return exported?.meta ?? null;
}

function withFlattenedSize(held) {
	const { size, isManifest, $generated, migrates, ...rest } = held ?? {};
	const pixels = Object.fromEntries(
		SIZE_KEYS.filter((key) => typeof size?.[key] === "number").map((key) => [key, size[key]]),
	);
	return { ...rest, ...pixels };
}

export function manifestOf(record, exported, derived = null) {
	const declared = declarationOf(exported);
	const props = propsOf(declared?.props ?? null, derived ?? record?.props ?? null);
	return { ...withFlattenedSize(record), ...withFlattenedSize(declared), id: record.id, ...(props ? { props } : {}) };
}

const CARD_KEYS = ["title", "description", "keywords", "role", "view", "inline", "size", "preview", "slots", "mounts"];

const jsonSafe = (held) => JSON.parse(JSON.stringify(held));

const jsonSafeWhenSet = (held) => (held === undefined ? undefined : jsonSafe(held));

const migratesOf = (steps) => steps.map((step) => ({ from: jsonSafe(propsOf(step.from, null)) }));

export function cardOf(declared, api) {
	return {
		$generated: GENERATED_NOTE,
		api,
		...present(CARD_KEYS.map((key) => [key, jsonSafeWhenSet(declared[key])])),
		props: jsonSafe(propsOf(declared.props, null) ?? {}),
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
	return files?.[RECORD_FILE] ?? files?.[LEGACY_RECORD_FILE];
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
