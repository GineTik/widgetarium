import path from "node:path";
import { RECORD_FILE } from "@widgetarium/core/engine/catalogue-index.js";
import { scopedName } from "@widgetarium/core/engine/github.js";
import { REGISTRY_FILE, readRegistry, type RegistryRow } from "@widgetarium/core/engine/registry-file.js";
import { WidgetCardSchema, type WidgetCard } from "./catalogue-card.js";
import { CliRefusal } from "./cli-output.js";
import { readerFor, type RegistryReader } from "./registry-reader.js";

export interface CatalogueEntry {
	readonly id: string;
	readonly scope: string;
	readonly folder: string;
	readonly card: WidgetCard;
	readonly reader: RegistryReader;
}

export interface RegistryReading {
	readonly at: string;
	readonly name: string | null;
	readonly refusal: string | null;
	readonly problems: readonly string[];
}

export interface Catalogue {
	readonly registries: readonly RegistryReading[];
	readonly entries: readonly CatalogueEntry[];
}

interface RegistryRead {
	readonly reading: RegistryReading;
	readonly entries: readonly CatalogueEntry[];
}

type RowRead = { readonly entry: CatalogueEntry } | { readonly problem: string };

export async function readCatalogue(places: readonly string[]): Promise<Catalogue> {
	const read = await Promise.all(places.map(readRegistryAt));
	return {
		registries: read.map(({ reading }) => reading),
		entries: firstOfEachId(read.flatMap(({ entries }) => entries)),
	};
}

export function entryById(catalogue: Catalogue, id: string): CatalogueEntry {
	const entry = catalogue.entries.find((held) => held.id === id);
	if (entry !== undefined) return entry;
	throw new CliRefusal(`no registry read offers ${id}; look for it with: widgetarium catalogue search ${nameOfId(id)}`);
}

export function nameOfId(id: string): string {
	return id.slice(id.indexOf("/") + 1);
}

export function scopeOfId(id: string): string {
	return id.slice(0, id.indexOf("/"));
}

export function scopeFolderOf(entry: CatalogueEntry): string {
	return path.posix.dirname(entry.folder);
}

async function readRegistryAt(place: string): Promise<RegistryRead> {
	const reader = readerFor(place);
	const text = await reader.read(REGISTRY_FILE);
	if (text === null) return refusedRegistry(place, `holds no ${REGISTRY_FILE}`);
	const registry = readRegistry(text, `${place}/${REGISTRY_FILE}`);
	if (registry.refusal !== null) return refusedRegistry(place, registry.refusal);
	const rows = await Promise.all(registry.rows.map((row) => rowRead(row, reader)));
	return {
		reading: {
			at: place,
			name: registry.name,
			refusal: null,
			problems: rows.flatMap((row) => ("problem" in row ? [row.problem] : [])),
		},
		entries: rows.flatMap((row) => ("entry" in row ? [row.entry] : [])),
	};
}

async function rowRead(row: RegistryRow, reader: RegistryReader): Promise<RowRead> {
	const folder = row.path ?? scopedName(row.id);
	if (folder === null) return { problem: `${row.id} names no folder` };
	const text = await reader.read(`${folder}/${RECORD_FILE}`);
	if (text === null) return { problem: `${row.id} has no ${RECORD_FILE} at ${folder}; run npm run manifest there` };
	const card = WidgetCardSchema.safeParse(parsedJson(text));
	if (!card.success) return { problem: `${row.id}: ${folder}/${RECORD_FILE} is not a card: ${card.error.message}` };
	return { entry: { id: row.id, scope: scopeOfId(row.id), folder, card: card.data, reader } };
}

function parsedJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function refusedRegistry(at: string, refusal: string): RegistryRead {
	return { reading: { at, name: null, refusal, problems: [] }, entries: [] };
}

function firstOfEachId(entries: readonly CatalogueEntry[]): CatalogueEntry[] {
	const byId = new Map<string, CatalogueEntry>();
	for (const entry of entries) if (!byId.has(entry.id)) byId.set(entry.id, entry);
	return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}
