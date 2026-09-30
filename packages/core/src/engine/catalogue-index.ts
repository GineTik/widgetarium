import { isObject } from "./is-object.js";

export type Fields = Readonly<Record<string, unknown>>;

export interface WidgetRecord {
	readonly [field: string]: unknown;
	readonly id: string;
	readonly title: unknown;
}

export type OrderedProps = Readonly<Record<string, Fields>>;

export interface EngineManifest {
	readonly [field: string]: unknown;
	readonly id: string;
	readonly props?: OrderedProps;
}

export interface MigratedFrom {
	readonly from: unknown;
}

export interface GeneratedCard {
	readonly [field: string]: unknown;
	readonly $generated: string;
	readonly api: unknown;
	readonly props: unknown;
	readonly migrates: readonly MigratedFrom[];
}

export type IdentifiedRow = Fields & { readonly id: string };

export interface IndexedEntry {
	readonly manifest: WidgetRecord;
	readonly installed: false;
	readonly origin: unknown;
}

export interface KeyedEntry {
	readonly manifest?: { readonly id?: unknown } | null | undefined;
}

export const RECORD_FILE = "manifest.generated.json";
export const RECORD_FILES: readonly string[] = [RECORD_FILE];
export const GENERATED_NOTE = "widgetarium build — do not edit";

const PROP_KEYS: readonly string[] = [
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

const SIZE_KEYS: readonly string[] = ["collapseBelowPx", "stackBelowPx"];

const CARD_KEYS: readonly string[] = [
	"title",
	"description",
	"keywords",
	"role",
	"view",
	"inline",
	"size",
	"preview",
	"slots",
	"mounts",
];

const COMPARED_CARD_KEYS: readonly string[] = [...CARD_KEYS, "props", "migrates"];

export function readRecord(raw: unknown, idOfItsFolder: string): WidgetRecord {
	const held = isObject(raw) ? raw : {};
	const ownId = held["id"];
	const named = typeof ownId === "string" && ownId ? ownId : idOfItsFolder;
	return { ...held, id: named, title: held["title"] ?? named };
}

export function manifestOf(record: WidgetRecord, exported: unknown): EngineManifest {
	const declared = declarationOf(exported);
	const props = propsOf(declared?.["props"] ?? record["props"] ?? null);
	return { ...withFlattenedSize(record), ...withFlattenedSize(declared), id: record.id, ...(props ? { props } : {}) };
}

export function cardOf(declared: Fields, api: unknown): GeneratedCard {
	return {
		$generated: GENERATED_NOTE,
		api,
		...present(CARD_KEYS.map((key) => [key, jsonSafeWhenSet(declared[key])] as const)),
		props: jsonSafe(propsOf(declared["props"]) ?? {}),
		migrates: migratesOf(declared["migrate"]),
	};
}

export function firstDifferingCardKey(
	fromCode: Fields | null | undefined,
	served: Fields | null | undefined,
): string | null {
	return (
		COMPARED_CARD_KEYS.find(
			(key) => JSON.stringify(fromCode?.[key] ?? null) !== JSON.stringify(served?.[key] ?? null),
		) ?? null
	);
}

export function recordIn(files: Readonly<Record<string, string>> | null | undefined): string | undefined {
	return files?.[RECORD_FILE];
}

export function hasStringId(entry: unknown): entry is IdentifiedRow {
	return isObject(entry) && typeof entry["id"] === "string" && entry["id"] !== "";
}

export function readIndex(raw: unknown): IndexedEntry[] {
	const widgets = isObject(raw) ? raw["widgets"] : null;
	const listed: readonly unknown[] = Array.isArray(widgets) ? widgets : [];
	return listed.filter(hasStringId).map((entry) => ({
		manifest: readRecord(entry, entry.id),
		installed: false,
		origin: entry["repository"] ?? "index",
	}));
}

export function mergeCatalogue<Entry extends KeyedEntry>(
	installed: readonly Entry[],
	available: readonly Entry[],
): Entry[] {
	const known = new Set(installed.map((entry) => entry.manifest?.id));
	const held = [...installed];
	for (const entry of available) {
		if (known.has(entry.manifest?.id)) continue;
		known.add(entry.manifest?.id);
		held.push(entry);
	}
	return held;
}

export function isInstalled(entry: { readonly installed?: unknown } | null | undefined): boolean {
	return entry?.installed !== false;
}

function specInOneOrder(spec: unknown): Fields {
	const held = isObject(spec) ? spec : {};
	const written = Object.keys(held);
	const ordered = [
		...PROP_KEYS.filter((key) => written.includes(key)),
		...written.filter((key) => !PROP_KEYS.includes(key)),
	];
	return Object.fromEntries(ordered.map((key) => [key, held[key]]));
}

function present(entries: readonly (readonly [string, unknown])[]): Fields {
	return Object.fromEntries(entries.filter(([, held]) => held !== undefined));
}

function propsOf(declared: unknown): OrderedProps | null {
	if (!declared || !isObject(declared)) return null;
	return Object.fromEntries(Object.entries(declared).map(([name, spec]) => [name, specInOneOrder(spec)]));
}

function declarationOf(exported: unknown): Fields | null {
	const isHolder = (typeof exported === "object" || typeof exported === "function") && exported !== null;
	const manifest = isHolder && "manifest" in exported ? exported.manifest : null;
	return isObject(manifest) ? manifest : null;
}

function preferredSizeOf(size: Fields): Fields {
	const { preferredWidth, preferredHeight, keepsRatio, at } = size;
	if (preferredWidth === undefined && preferredHeight === undefined) return {};
	return { preferredSize: { preferredWidth, preferredHeight, keepsRatio: keepsRatio === true, at: at ?? [] } };
}

function withFlattenedSize(held: Fields | null): Fields {
	const { size, isManifest, $generated, migrates, ...rest } = held ?? {};
	const sized = isObject(size) ? size : {};
	const pixels = Object.fromEntries(
		SIZE_KEYS.filter((key) => typeof sized[key] === "number").map((key) => [key, sized[key]]),
	);
	return { ...rest, ...pixels, ...preferredSizeOf(sized) };
}

function jsonSafe(held: unknown): unknown {
	return JSON.parse(JSON.stringify(held));
}

function jsonSafeWhenSet(held: unknown): unknown {
	return held === undefined ? undefined : jsonSafe(held);
}

function migratesOf(steps: unknown): MigratedFrom[] {
	const listed: readonly unknown[] = Array.isArray(steps) ? steps : [];
	return listed.map((step) => ({ from: jsonSafe(propsOf(isObject(step) ? step["from"] : null)) }));
}
